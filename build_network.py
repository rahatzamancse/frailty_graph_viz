import csv
import glob
import itertools as it
import logging
import os.path
import pickle
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import NamedTuple, Set

import ipdb
import networkx as nx
import plac as plac
from tqdm import tqdm


# Function definitions
def read_uniprot(path):
    """ Parse the fasta file with uniprot data to generate a dictionary of descriptions """

    ret = {}
    with open(path, 'r') as f:
        for line in tqdm(f, desc='Reading uniprot ...'):
            if line.startswith('>sp'):
                prefix = line.split('OS=')[0]
                triplet, desc = prefix.split(' ', 1)
                gid = triplet.split('|')[1]
                ret[gid] = desc
    return ret


def parse_file(p):
    """
    Reads a TSV (Arizona format) file and returns a list with dictionary elements for each row
    """
    try:
        with open(p) as f:
            reader = csv.DictReader(f, delimiter='\t')
            rows = list(reader)
    except Exception as ex:
        rows = list()

    return rows


def parse_files(ps):
    """
    Reads all files and joins the resulting dictionaries
    """
    frs = list()
    for p in ps:
        fr = parse_file(p)
        frs.extend(fr)
    return frs


def is_black_listed(s: str) -> bool:
    """
    Used to filter out rows due to malformed participants in its fields
    """
    # If participant is not a string, don't proceed
    if s == '':
        return True
    # If participant is "complex"  don't proceed
    if s[0] == '{' or s[-1] == '}':
        return True
    # Otherwise, can proceed
    return False


def fix_frailty_groundings(pre):
    """ Will apply ad-hoc fixes to the grounding ids"""
    # Will fix labels
    if pre == "frailty:FR00001":
        ipdb.set_trace()
    return pre.replace("frailty:FR00001", "mesh:D000073496")


# Pre-compile a regex to save time
suffix = re.compile(r"(\.\w+|:\[\w+\])+$", re.IGNORECASE)


def decompose_complex(sq):
    """ Breaks down complex participants into individual participants """

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


def merge_graphs(g, h):
    """ Merges two existing graphs preserving information """
    i = nx.MultiDiGraph()

    i.add_edges_from(tqdm(it.chain(g.edges(data=True), h.edges(data=True)), desc="Merging edges"))
    i.add_nodes_from(tqdm(it.chain(g.nodes(data=True), h.nodes(data=True)), desc="Merging nodes"))

    return i


class EdgeData(NamedTuple):
    """ Named tuple to encode the identity of an edge in the graph"""
    controller: str
    input: str
    output: str
    trigger: str
    label: str

class SignificanceRow(NamedTuple):
    """ Represents the elements of a significance extration """
    type_: str
    value: str

@plac.pos('uniprot_path', 'Uniprot fasta file, for the participant descriptions', type=Path)
@plac.pos('input_files_dir', 'Arizona files directory', type=Path)
@plac.pos('output_file', 'Graph output file', type=Path)
def main(uniprot_path='data/uniprot_sprot.fasta',
         input_files_dir='/home/enrique/data/arizona_associations_markup/',
         output_file="graph.pickle"):
    """
    Reads
    """

    # Read uniprot for the top_descriptions
    uniprot_names = read_uniprot(uniprot_path)
    paths = glob.glob(os.path.join(input_files_dir, "*.tsv"))

    # Generate a data frame from the arizona output files
    all_rows = parse_files(tqdm(paths, desc='Parsing files'))

    # Dict to resolve the oututs
    dataset_outputs = dict()
    # Dict to resolve the inputs
    dataset_inputs = dict()
    # Store the significance extractions in this variable
    significance_extractions = defaultdict(list)

    # Fix the participant names here:
    for row in tqdm(all_rows, desc='Fixing participant\'s names'):
        row['INPUT'] = fix_frailty_groundings(row['INPUT'])
        row['OUTPUT'] = fix_frailty_groundings(row['OUTPUT'])
        row['CONTROLLER'] = fix_frailty_groundings(row['CONTROLLER'])

        # Handle significance rows
        if row['EVENT LABEL'] == 'Significance':
            type_ = row['INPUT'].lower()
            value = row['OUTPUT']
            paper = row['SEEN IN']
            if paper is not None:  # Be sure to memorize only those instances that can be attributed to a paper
                significance_extractions[paper].append(SignificanceRow(type_, value))



    for row in tqdm(all_rows, desc="Caching inputs and outputs"):
        # key = (row._19, row._4) # ._4 = EVENT ID, ._19 = SEEN IN
        key = (row['EVENT ID'], row['SEEN IN'])
        val_o = row['OUTPUT']
        dataset_outputs[key] = val_o
        val_i = row['INPUT']
        dataset_inputs[key] = val_i

    # Filter criteria to discard any row with a malformed participant
    row_stays = lambda row: not is_black_listed(row['INPUT']) and \
                            not is_black_listed(row['OUTPUT']) and \
                            not is_black_listed(row['CONTROLLER'])

    filtered_rows = [row for row in tqdm(all_rows, desc='Choosing the rows to keep') if row_stays(row)]

    # Build top_descriptions
    all_descriptions = defaultdict(Counter)

    for row in tqdm(filtered_rows, desc='Generating entity top_descriptions'):
        for participant in (row[p] for p in ('INPUT', 'OUTPUT', 'CONTROLLER')):
            if participant != 'NONE':
                for txt, gid in decompose_complex([participant]):
                    num = gid.split(':')[-1]  # Uniprot key
                    all_descriptions[gid][uniprot_names.get(num, txt)] += 1  # If in uniprot, use the desc, otherwise,
                    # use the text

    # Choose the  most frequent description for each entity
    top_descriptions = {k: v.most_common()[0][0] for k, v in
                        tqdm(all_descriptions.items(), desc='Choosing the most frequent description')}

    # Start building the graph edges here
    counts = Counter()
    evidences = defaultdict(set)
    seen_in = defaultdict(set)  # Keep track of the papers where an edge has been observed
    edges: Set[EdgeData] = set()

    def resolve(eid, col, paper):
        cache = dataset_inputs if col == 'OUTPUT' else dataset_outputs

        if "::" not in eid and eid != 'NONE':
            # Resolve complex events by following the trace of the events in the frame
            row = cache[(eid, paper)]
            # If we look for the input, of an event, then the realized element is the outut of the input
            if col == 'INPUT':
                return resolve(row, 'OUTPUT', paper)
            elif col == 'OUTPUT':
                return resolve(row, 'INPUT', paper)
            elif col == 'CONTROLLER':
                return resolve(row, 'OUTPUT', paper)
            else:
                raise Exception("Invalid resolution")
        else:
            return eid

    # Build the edges from the rows in the data frame
    for row in tqdm(filtered_rows, desc='Building edges'):
        # Ignore those that have adhoc entities, i.e. uaz prefixes
        if "uaz:" not in row['INPUT'] and "uaz:" not in row['OUTPUT'] and "uaz:" not in row['CONTROLLER']:
            try:
                paper = row['SEEN IN']
                inputs = list(decompose_complex([resolve(row['INPUT'], 'INPUT', paper)]))
                outputs = list(decompose_complex([resolve(row['OUTPUT'], 'OUTPUT', paper)]))
                controllers = list(decompose_complex([resolve(row['CONTROLLER'], 'CONTROLLER', paper)]))
                label = row['EVENT LABEL']

                if len(controllers) > 0:
                    for controller, input, output in it.product(controllers, inputs, outputs):
                        controller = controller[1]
                        input = input[1]
                        output = output[1]
                        freq = row['SEEN']
                        doc = row['SEEN IN']
                        trigger = row['TRIGGERS']
                        evidence = row['EVIDENCE'].split(' ++++ ')

                        key = EdgeData(controller, input, output, trigger, label)
                        seen_in[key].add(doc) # This is the PMCID or paper id where the edge has been seen
                        counts[key] += int(freq)  # This comes as string, cast it to an int
                        evidences[key] |= {(doc, e) for e in evidence}

                        # Build the edge
                        edges.add(key)
                elif "ssociation" in label:

                    participants = [p for p in row['INPUT'].split(', ') if '::' in p]
                    if len(participants) > 1:
                        controller, output = [p[1] for p in list(decompose_complex([row.INPUT]))]
                        if controller != output:
                            input = controller
                            freq = row['SEEN']
                            doc = row['SEEN IN']
                            trigger = row['TRIGGERS']
                            evidence = row['EVIDENCE'].split(' ++++ ')

                            key = EdgeData(controller, input, output, trigger, label)
                            seen_in[key].add(doc)  # This is the PMCID or paper id where the edge has been seen
                            counts[key] += int(freq)  # This comes as string, cast it to an int
                            evidences[key] |= {(doc, e) for e in evidence}


                            # Build the edge
                            edges.add(key)
            except Exception as ex:
                pass  # TODO log exceptions

    # Create the nx graph
    G = nx.MultiDiGraph()

    for key in tqdm(edges, desc="Making graph"):
        try:
            if key.controller not in G.nodes:
                G.add_nodes_from([(key.controller, {'label': top_descriptions[key.controller]})])
            if key.input not in G.nodes:
                G.add_nodes_from([(key.input, {'label': top_descriptions[key.input]})])

            if type(key.trigger) == str:
                trigger = key.trigger
            else:
                trigger = key.label

            G.add_edge(key.controller, key.output, input=key.output, trigger=trigger, freq=len(evidences[key]),
                       evidence=[f'{id}: {s}' for id, s in evidences[key]], seen_in=seen_in[key], label=key.label)
        except Exception as ex:
            print(key)
            print(ex)

    output = {
        'graph': G,
        'significance': dict(**significance_extractions)
    }
    # Save the graph into a file
    logging.info(f"Saving output to {output_file}")
    with open(output_file, 'wb') as f:
        pickle.dump(output, f)
    logging.info("Done")


if __name__ == "__main__":
    plac.call(main)
