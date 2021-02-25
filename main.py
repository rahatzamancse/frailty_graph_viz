import pickle
import json
import itertools as it
import networkx as nx

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

print("Loading data ...")
with open("/Users/enrique/Desktop/frialty/il6.pickle", 'rb') as f:
    graph = pickle.load(f)

print("Cleaning graph ...")
graph.remove_edges_from(list(nx.selfloop_edges(graph)))
uaz_nodes = [n for n in graph.nodes if n.startswith("uaz:")]
graph.remove_nodes_from(uaz_nodes)

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
    return RedirectResponse("/static/viz.html")

async def star():
    return convert2cytoscapeJSON(graph.subgraph(list(graph.neighbors("uniprot:P05231")) + ["uniprot:P05231"]))


@app.get("/interaction/{source}/{destination}")
async def interaction(source, destination):
    # Find the shortest path between source and destination
    path = nx.shortest_path(graph, source, destination)
    subgraph = graph.subgraph(path)

    return convert2cytoscapeJSON(subgraph)


@app.get("/neighbors/{elem}")
async def neighbors(elem):
    subgraph = graph.subgraph(list(graph.neighbors(elem)) + [elem])

    edges = [e for e in subgraph.edges if (e[0] == elem or e[1] == elem)]
    edges.sort(key=lambda e: sum(v for k, v in subgraph.get_edge_data(*e).items() if k == 'freq'), reverse=True)

    discarded = set(edges[5:])
    edges = set(edges)

    new_edges = [(*e, subgraph.get_edge_data(*e)) for e in subgraph.edges if e in edges and e not in discarded]
    new_g = nx.MultiDiGraph()
    # new_g.add_nodes_from(set(it.chain.from_iterable((e[0], e[1]) for e in new_edges)))
    new_g.add_edges_from(new_edges)

    new_g.remove_edges_from(discarded)

    return convert2cytoscapeJSON(new_g)


@app.get('/evidence/{source}/{destination}/{trigger}')
async def evidence(source, destination, trigger):
    edges = graph[source][destination]
    edge = [e for e in edges.values() if e['trigger'] == trigger][0]
    evidence = list(set(edge['evidence']))
    return evidence



def convert2cytoscapeJSON(G):
    # load all nodes into nodes array
    final = []

    for node in G.nodes():
        nx = {}
        nx["data"] = {}
        nx["data"]["id"] = node
        nx["data"]["label"] = G.nodes[node]['label'] if 'label' in G.nodes[node] else node
        final.append(nx.copy())
    # load all edges to edges array
    for edge in G.edges():
        nx = {}
        nx["data"] = {}
        nx["data"]["id"] = edge[0] + edge[1]
        nx["data"]["source"] = edge[0]
        nx["data"]["target"] = edge[1]
        print(len(G.get_edge_data(edge[0], edge[1])))
        data = list(G.get_edge_data(edge[0], edge[1]).values())[0]
        nx["data"]["freq"] = data['freq']
        nx["data"]["trigger"] = data['trigger'] if type(data['trigger']) != float else ""
        # nx["data"]["evidence"] = list(set(data['evidence']))
        final.append(nx)
    return json.dumps(final)
