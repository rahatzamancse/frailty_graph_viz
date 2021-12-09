""" Client interface to the ES index """
from typing import Optional, Dict, Any, Iterable

from elasticsearch import Elasticsearch

from evidence_index import Evidence


class EvidenceIndexClient:

    def __init__(self, index:str, host:str = "localhost"):
        self._host = host
        self._index = index
        self._es: Optional[Elasticsearch] = None

    @property
    def _client(self):
        if self._es is None:
            self._es = Elasticsearch(hosts=[self._host])
        return self._es

    def query(self, field: str, querystr: str, max_results: int) -> Iterable[Evidence]:
        es = self._client
        body = {
          "query": {
            "match": { field:  querystr }
          }, "size": max_results
        }

        ret = list()
        for res in es.search(body = body, index=self._index)['hits']['hits']:
            data = res['_source']
            ev = Evidence(**data)
            ret.append(ev)

        return ret