import csv
import glob
import re
import ipdb
from pandas.core import frame
from tqdm import tqdm
import networkx as nx
import pandas as pd
import json
import itertools as it
from collections import Counter, defaultdict
import ipdb
from concurrent.futures import ProcessPoolExecutor, as_completed
import numpy as np
import os.path

UNIPROT_PATH = 'uniprot_sprot.fasta'
INPUT_FILES_DIR = 'new_arizona/'

# Initialize the pandas hook on tqdm
tqdm.pandas()


## Function definitions
def read_uniprot(path):
    ''' Parse the fasta file with uniprot data to generate a dictionary of descriptions '''

    ret = {}
    with open(path, 'r') as f:
        for line in tqdm(f, desc='Reading uniprot ...'):
            if line.startswith('>sp'):
                prefix = line.split('OS=')[0]
                triplet, desc = prefix.split(' ', 1)
                gid = triplet.split('|')[1]
                ret[gid] = desc
    return ret


# Parse an arizona output file and generates a pandas dataframe
def parse_file(p):
    try:
        fr = pd.read_csv(p, delimiter='\t')
    except:
        pass
    else:
        return fr


# Calls parse_file on a sequence of paths and returns a concatenated data frame
def parse_files(ps):
    frs = list()
    for p in ps:
        fr = parse_file(p)
        if fr is not None:
            frs.append(fr)
    return pd.concat(frs)


# Function to filter participants with underisable names
def is_black_listed(s):
    # If participant is not a string, don't proceed
    if type(s) != str:
        return True
    # If participant is "complex"  don't proceed
    if s[0] == '{' or s[-1] == '}':
        return True
    # Otherwise, can proceed
    return False


def fix_frailty_groundings(pre):
    """ Will apply ad-hoc fixes to the grounding ids"""
    # Will fix labels
    return pre.replace("frailty:FR00001", "mesh:D000073496")


def decompose_complex(sq):
    ''' Breaks down complex participants into individual participants '''
    suffix = re.compile(r"(\.\w+|:\[\w+\])+$", re.IGNORECASE)
    for s in sq:
        s = s.strip('{}')
        elems = s.split(', ')
        for e in elems:
            if '::' in e:
                e = suffix.sub("", e)
                assert e != ''
                if 'uaz:' not in e:
                    txt, gid = e.split('::')
                    yield txt, gid.split('.')[0]


def merge_graphs(G, H):
    """ Merges two existing graphs preserving information """
    I = nx.MultiDiGraph()

    I.add_edges_from(tqdm(it.chain(G.edges(data=True), H.edges(data=True)), desc="Merging edges"))
    I.add_nodes_from(tqdm(it.chain(G.nodes(data=True), H.nodes(data=True)), desc="Merging nodes"))

    return I


### Here is the actual execution

# Read uniprot for the descriptions
uniprot_names = read_uniprot(UNIPROT_PATH)
paths = list(glob.glob(os.path.join(INPUT_FILES_DIR, "*.tsv")))

frames = list()

### This was the multiprocess reading
# with ProcessPoolExecutor(max_workers=6) as ctx:
#     futures = {ctx.submit(parse_files, p) for p in np.array_split(paths, 1000)}
#
#     for future in tqdm(as_completed(futures), desc='parsing files', total=len(futures)):
#         res = future.result()
#         if res is not None:
#             frames.append(res)
#         else:
#             print("beep")
# giant = pd.concat(frames)

# Generate a data frame from the arizona output files
giant = parse_files(tqdm(paths, desc='parsing files'))

# Dict to resolve the oututs
outputs = dict()
# Dict to resolve the inputs
inputs = dict()

for t in tqdm(giant.itertuples(), total=len(giant), desc="Caching inputs and outputs"):
    key = (t._19, t._4)
    val_o = t.OUTPUT
    outputs[key] = val_o
    val_i = t.INPUT
    inputs[key] = val_i

pat = re.compile(r'^E\d+$')

filtered = giant[giant.progress_apply(
    lambda r: not is_black_listed(r.INPUT) and not is_black_listed(r.OUTPUT) and not is_black_listed(r.CONTROLLER),
    axis=1)]

filtered['INPUT'] = filtered['INPUT'].map(fix_frailty_groundings)
filtered['OUTPUT'] = filtered['OUTPUT'].map(fix_frailty_groundings)
filtered['CONTROLLER'] = filtered['CONTROLLER'].map(fix_frailty_groundings)


def split_entity(s):
    if s[0] == 'E':
        return s, s
    elif s == 'NONE':
        # return None, None
        return None
    else:
        tokens = s.split('::')
        text = tokens[0]
        gid = tokens[1]
        return gid, text


all_descriptions = defaultdict(list)
for txt, gid in tqdm(decompose_complex(
        p for p in it.chain(filtered.INPUT, filtered.OUTPUT, filtered.CONTROLLER) if p and p != 'NONE'),
        desc='Making descs'):
    # if len(txt) > 1:
    num = gid.split(':')[-1]
    if num in uniprot_names:
        all_descriptions[gid].append(uniprot_names[num])
    else:
        all_descriptions[gid].append(txt)

descriptions = {k: list(sorted(v, key=len))[0] for k, v in all_descriptions.items()}

counts = Counter()
evidences = defaultdict(set)
edges = set()

resolutions_frame = filtered.set_index(['EVENT ID', 'SEEN IN'])


def resolve(eid, col, paper):
    if "::" not in eid and eid != 'NONE':
        # Resolve complex events by following the trace of the events in the frame
        row = resolutions_frame.loc[(eid, paper)]
        # If we look for the input, of an event, then the realized element is the outut of the input
        if col == 'INPUT':
            return resolve(row.OUTPUT, 'OUTPUT', paper)
        elif col == 'OUTPUT':
            return resolve(row.INPUT, 'INPUT', paper)
        elif col == 'CONTROLLER':
            return resolve(row.OUTPUT, 'OUTPUT', paper)
        else:
            raise Exception("Invalid resolution")
    else:
        return eid


## Build the edges from the rows in the data frame
for t in tqdm(filtered.itertuples(), total=len(filtered), desc='Building edges'):
    # Ignore those that have adhoc entities, i.e. uaz prefixes
    if "uaz:" not in t.INPUT and "uaz:" not in t.OUTPUT and "uaz:" not in t.CONTROLLER:  # and not t.INPUT.startswith('E') and not t.OUTPUT.startswith('E') and not t.CONTROLLER.startswith('E'):
        try:
            paper = t._19
            inputs = list(decompose_complex([resolve(t.INPUT, 'INPUT', paper)]))
            outputs = list(decompose_complex([resolve(t.OUTPUT, 'OUTPUT', paper)]))
            controllers = list(decompose_complex([resolve(t.CONTROLLER, 'CONTROLLER', paper)]))
            label = t._5

            if len(controllers) > 0:
                for controller, input, output in it.product(controllers, inputs, outputs):
                    controller = controller[1]
                    input = input[1]
                    output = output[1]
                    freq = t.SEEN
                    doc = t._19
                    trigger = t.TRIGGERS
                    evidence = t.EVIDENCE.split(' ++++ ')

                    key = (controller, input, output, trigger, label)
                    counts[key] += freq
                    evidences[key] |= {(doc, e) for e in evidence}

                    # Build the edge
                    edges.add(key)
            elif "ssociation" in label:

                participants = [p for p in t.INPUT.split(', ') if '::' in p]
                if len(participants) > 1:
                    controller, output = [p[1] for p in list(decompose_complex([t.INPUT]))]
                    if controller != output:
                        input = controller
                        freq = t.SEEN
                        doc = t._19
                        trigger = t.TRIGGERS
                        evidence = t.EVIDENCE.split(' ++++ ')

                        key = (controller, input, output, trigger, label)
                        counts[key] += freq
                        evidences[key] |= {(doc, e) for e in evidence}

                        # Build the edge
                        edges.add(key)
        except:
            pass  # TODO log exceptions

# Create the nx graph
G = nx.MultiDiGraph()

for key in tqdm(edges, desc="Making graph"):
    if key[0] not in G.nodes:
        G.add_nodes_from([(key[0], {'label': descriptions[key[0]]})])
    if key[1] not in G.nodes:
        G.add_nodes_from([(key[1], {'label': descriptions[key[1]]})])

    if type(key[3]) == str:
        trigger = key[3]
    else:
        trigger = key[4]

    G.add_edge(key[0], key[2], input=key[2], trigger=trigger, freq=len(evidences[key]),
               evidence=[f'{id}: {s}' for id, s in evidences[key]], label=key[4])
