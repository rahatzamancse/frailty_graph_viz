import pickle
import json
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


@app.get("/interaction/{source}/{destination}")
async def interaction(source, destination):
    # Find the shortest path between source and destination
    path = nx.shortest_path(graph, source, destination)
    subgraph = graph.subgraph(path)

    return convert2cytoscapeJSON(subgraph)


@app.get("/neighbors/{elem}")
async def neighbors(elem):
    return convert2cytoscapeJSON(graph.subgraph(list(graph.neighbors(elem))[:10] + [elem]))


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
        data = G.get_edge_data(edge[0], edge[1])[0]
        nx["data"]["freq"] = data['freq']
        nx["data"]["trigger"] = data['trigger'] if type(data['trigger']) != float else ""
        nx["data"]["evidence"] = list(set(data['evidence']))
        final.append(nx)
    return json.dumps(final)
