import itertools as it
import json
import pickle
from collections import defaultdict

import networkx as nx
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from tqdm import tqdm
import annotations

AGGREGATION_FIELD = "polarity"

print("Loading data ...")
with open("/Users/enrique/Desktop/frialty/il6-new.pickle", 'rb') as f:
    graph = pickle.load(f)

def infer_polarity(edge):
    """ Temporary function that will infer polarity out of the label for display and grouping purposes """
    label = edge['label'].lower()
    if "positive" in label:
        polarity = "Positive"
    elif "negative" in label:
        polarity = "Negative"
    else:
        polarity = "Neutral"

    return polarity

# Add polarity to all edges. This will go away soon
for (_, _, data) in graph.edges(data=True):
    polarity = infer_polarity(data)
    data['polarity'] = polarity

print("Cleaning graph ...")
graph.remove_edges_from(list(nx.selfloop_edges(graph)))
uaz_nodes = [n for n in graph.nodes if n.startswith("uaz:")]
graph.remove_nodes_from(uaz_nodes)

# Compute the graph entities
entities = {f"{graph.nodes[n]['label']} ({n})" for n in graph.nodes if 'label' in graph.nodes[n]}
# Cache the evidence
print("Building evidence")
evidence_sentences = defaultdict(list)
weighs = defaultdict(int)
for s, d, ix in tqdm(graph.edges, desc="Caching evidence"):
    edge = graph[s][d][ix]

    polarity = edge['polarity']

    trigger = edge['trigger']

    # key = (s, d, trigger.replace(" ++++ ", ", "))
    key = (s, d, polarity)
    w_key = frozenset((s, d))
    sents = list(set(edge['evidence']))
    weighs[w_key] += len(sents)
    evidence_sentences[key] += sents
    # evidence_sentences[key] = sents[0]
    del edge['evidence']

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    return RedirectResponse("/static/overview.html")


async def star():
    return convert2cytoscapeJSON(graph.subgraph(list(graph.neighbors("uniprot:P05231")) + ["uniprot:P05231"]))


@app.get("/interaction/{source}/{destination}/{bidirectional}")
async def interaction(source, destination, bidirectional: bool):
    # Find the shortest path between source and destination
    path = nx.shortest_path(graph, source, destination)
    valid_edges = set(zip(path, path[1:]))
    subgraph = graph.subgraph(path)

    edges = list(
        sorted((e for e in subgraph.edges if bidirectional or (e[0], e[1]) in valid_edges), key=lambda e: (e[0], e[1])))
    grouped_edges = it.groupby(edges, key=lambda e: (e[0], e[1]))

    discarded = set()

    for group, subset in grouped_edges:
        subset = list(subset)
        subset.sort(key=lambda e: sum(v for k, v in subgraph.get_edge_data(*e).items() if k == 'freq'), reverse=True)
        # discarded |= set(subset[5:])

    # edges = set(subgraph.edges)

    new_edges = [(*e, subgraph.get_edge_data(*e)) for e in subgraph.edges if e in edges and e not in discarded]

    # Group the new edges by their label
    aggregated_new_edges = dict()
    for (src, dst, _, data) in new_edges:
        # key = (src, dst, data['label'])
        field = 'label'

        for txt in data[field].split(" ++++ "):
            key = (src, dst, txt)
            local_data = dict(data.items())
            local_data[field] = txt
            if key not in aggregated_new_edges:
                aggregated_new_edges[key] = local_data
            else:
                d = aggregated_new_edges[key]
                d[field] += ' ++++ ' + local_data[field]
                d['freq'] += local_data['freq']

    # Remove duplicate terms from triggers
    for data in aggregated_new_edges.values():
        data[field] = ', '.join(sorted(set(data[field].split(" ++++ "))))

    new_edges = [(k[0], k[1], ix, v) for ix, (k, v) in enumerate(aggregated_new_edges.items())]

    new_g = nx.MultiDiGraph()
    # new_g.add_nodes_from(set(it.chain.from_iterable((e[0], e[1]) for e in new_edges)))
    new_nodes = list()

    for e in new_edges:
        new_nodes.append((e[0], subgraph.nodes[e[0]]))
        new_nodes.append((e[1], subgraph.nodes[e[1]]))
    # new_nodes = set(it.chain.from_iterable((n, subgraph.nodes[n]) for n in e for e in new_edges))
    new_g.add_nodes_from(list(new_nodes))
    new_g.add_edges_from(new_edges)

    new_g.remove_edges_from(discarded)

    return convert2cytoscapeJSON(new_g)


@app.get("/neighbors/{elem}")
async def neighbors(elem):
    subgraph = graph.subgraph(list(graph.neighbors(elem)) + list(graph.predecessors(elem)) + [elem])

    edges = [e for e in subgraph.edges if (e[0] == elem or e[1] == elem)]
    edges.sort(key=lambda e: sum(v for k, v in subgraph.get_edge_data(*e).items() if k == 'freq'), reverse=True)

    discarded = set(edges[100:])
    # discarded = set()
    edges = set(edges)

    new_edges = [(*e, subgraph.get_edge_data(*e)) for e in subgraph.edges if e in edges and e not in discarded]
    new_g = nx.MultiDiGraph()
    # new_g.add_nodes_from(set(it.chain.from_iterable((e[0], e[1]) for e in new_edges)))
    new_nodes = list()

    for e in new_edges:
        new_nodes.append((e[0], subgraph.nodes[e[0]]))
        new_nodes.append((e[1], subgraph.nodes[e[1]]))
    # new_nodes = set(it.chain.from_iterable((n, subgraph.nodes[n]) for n in e for e in new_edges))
    new_g.add_nodes_from(list(new_nodes))
    new_g.add_edges_from(new_edges)

    new_g.remove_edges_from(discarded)

    return convert2cytoscapeJSON(new_g)


@app.get('/evidence/{source}/{destination}/{trigger}')
async def evidence(source, destination, trigger):
    sents = evidence_sentences[(source, destination, trigger)]
    docs = list(annotations.pipe_sentences(sents))
    enhanced_sents = [annotations.make_text(d) for d in docs]
    return enhanced_sents


@app.get('/entities')
async def graph_entities(term=''):
    term = term.lower()
    candidates = [e for e in entities if term in e.lower()]
    return candidates


@app.get('/overview/{term}')
async def anchor(term):
    ''' Returns the neighors, classified by influenced on, by and reciprocal '''
    successors = set(graph.neighbors(term))
    predecessors = set(graph.predecessors(term))

    reciprocals = successors & predecessors
    influenced = successors - reciprocals
    influencers = predecessors - reciprocals

    return {
        'reciprocals': list(sorted(((r, graph.nodes[r]['label'], weighs[frozenset((term, r))]) for r in reciprocals if
                                    'label' in graph.nodes[r]), key=lambda x: x[1].lower())),
        'influenced': list(sorted(((r, graph.nodes[r]['label'], weighs[frozenset((term, r))]) for r in influenced if
                                   'label' in graph.nodes[r]), key=lambda x: x[1].lower())),
        'influencers': list(sorted(((r, graph.nodes[r]['label'], weighs[frozenset((term, r))]) for r in influencers if
                                    'label' in graph.nodes[r]), key=lambda x: x[1].lower())),
    }


def convert2cytoscapeJSON(G, label_field="polarity"):
    # Sort all the edges to be able to use group by. Make it a list to be able to iterate over it multiple times
    nx_edges = list(sorted(G.edges(data=True), key=lambda e: (e[0], e[1], e[2][label_field])))

    # load all nodes into nodes array
    final = []

    edges = list()
    cluster_edges = dict()
    for node in G.nodes():
        nx = {}
        nx["data"] = {}
        nx["data"]["id"] = node
        nx["data"]["label"] = G.nodes[node]['label'] if 'label' in G.nodes[node] else node
        final.append(nx.copy())

    def aggregate_edges(edges):
        """ Aggregates edges from a groupby """
        data = {'freq': 0, 'label': list(), 'trigger': list()}
        for edge in edges:
            e = edge[2]
            data['freq'] += int(e['freq'])
            data['trigger'].append(e['trigger'])
            data['label'].append(e['label'])
            data['polarity'] = e['polarity']

        data['trigger'] = ', '.join(data['trigger'])
        data['label'] = ', '.join(data['label'])

        return edge[0], edge[1], data

    # load all edges to edges array. Aggregate them by the label field
    for (ix, (g, es)) in enumerate(it.groupby(nx_edges, key=lambda e: (e[0], e[1], e[2][label_field]))):
        edge = aggregate_edges(es)
        data = edge[2]
        # for ix, data in enumerate(G.get_edge_data(edge[0], edge[1]).values()):
        nx = {}
        nx["data"] = {}
        nx["data"]["id"] = edge[0] + edge[1] + str(ix)
        nx["data"]["source"] = edge[0]
        nx["data"]["target"] = edge[1]
        nx["data"]["freq"] = data['freq']
        nx["data"]["trigger"] = (data['trigger'].replace(" ++++ ", ", ") if type(data['trigger']) != float else "")
        nx['data']['label'] = data['label']


        nx['data']['polarity'] = data['polarity']
        edges.append(nx)

    # Create the cluster edges
    for edge in edges:
        key = edge['data']['source'], edge['data']['target']
        if key not in cluster_edges:
            nx = {}
            nx["data"] = {}
            nx["data"]["id"] = "cluster_" + key[0] + key[1]
            nx["data"]["source"] = key[0]
            nx["data"]["target"] = key[1]
            nx["data"]["freq"] = edge['data']['freq']
            nx["data"]["trigger"] = ""
            nx['data']['label'] = ""

            cluster_edges[key] = nx
        else:
            nx["data"]["freq"] += edge['data']['freq']

    # Sort the edges by endpoints, then by frequency
    edges.sort(key=lambda e: (e['data']['source'], e['data']['target'], e['data']['trigger']))
    # Add the edges to the result
    final += (edges + list(cluster_edges.values()))
    return json.dumps(final)


if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=8000, debug=True)
