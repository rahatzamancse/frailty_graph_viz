import pickle
import json
import itertools as it
from collections import defaultdict

import uvicorn
import networkx as nx

from tqdm import tqdm
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

print("Loading data ...")
with open("/Users/enrique/Desktop/frialty/il6-associations.pickle", 'rb') as f:
    graph = pickle.load(f)

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
    key = (s, d, edge['trigger'].replace(" ++++ ", ", "))
    # key = (s, d, edge['label'])
    w_key = frozenset((s, d))
    sents = list(set(edge['evidence']))
    weighs[w_key] += len(sents)
    evidence_sentences[key] += sents
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
        for trigger in data['trigger'].split(" ++++ "):
            key = (src, dst, trigger)
            local_data = dict(data.items())
            local_data['trigger'] = trigger
            if key not in aggregated_new_edges:
                aggregated_new_edges[key] = local_data
            else:
                d = aggregated_new_edges[key]
                d['trigger'] += ' ++++ ' + local_data['trigger']
                d['freq'] += local_data['freq']

    # Remove duplicate terms from triggers
    for data in aggregated_new_edges.values():
        data['trigger'] = ', '.join(sorted(set(data['trigger'].split(" ++++ "))))

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
    return evidence_sentences[(source, destination, trigger)]


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


def convert2cytoscapeJSON(G):
    # load all nodes into nodes array
    final = []

    edges = list()
    for node in G.nodes():
        nx = {}
        nx["data"] = {}
        nx["data"]["id"] = node
        nx["data"]["label"] = G.nodes[node]['label'] if 'label' in G.nodes[node] else node
        final.append(nx.copy())
    # load all edges to edges array
    for edge in G.edges():
        for ix, data in enumerate(G.get_edge_data(edge[0], edge[1]).values()):
            nx = {}
            nx["data"] = {}
            nx["data"]["id"] = edge[0] + edge[1] + str(ix)
            nx["data"]["source"] = edge[0]
            nx["data"]["target"] = edge[1]
            nx["data"]["freq"] = data['freq']
            nx["data"]["trigger"] = (data['trigger'].replace(" ++++ ", ", ") if type(data['trigger']) != float else "")
            nx['data']['label'] = data['label']
            edges.append(nx)

    # Sort the edges by endpoints, then by frequency
    edges.sort(key=lambda e: (e['data']['source'], e['data']['target'], e['data']['trigger']))
    # Add the edges to the result
    final += edges
    return json.dumps(final)


if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=8000, debug=True)
