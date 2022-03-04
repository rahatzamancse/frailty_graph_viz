""" Central place to parse the cli arguments and make it accessible from other modules """

import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--graph-file', default='data/graph_xdd.pickle')
parser.add_argument('--impact-factors', default='data/journal_rankings.pickle')
parser.add_argument('--port', default=1600, type=int)
parser.add_argument('--records-db', default='records.db')
parser.add_argument('--es-index', default='frailty_001')
args = parser.parse_args()
