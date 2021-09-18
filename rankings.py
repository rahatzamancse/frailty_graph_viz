""" Make a dictionary with maps from PMCID -> journal name and journal name to impact metrics """

import csv
import pickle
import re
from pathlib import Path

import plac
from tqdm import tqdm

@plac.pos('pmc_file_list', help='Path to the FTP service file list', type=Path)
@plac.pos('rankings_file', help='CSV file with the rankings and impact factor data', type=Path)
@plac.pos('output_pickle', help='Output path for the pickle with the resulsts', type=Path)
def main(pmc_file_list:Path = Path('data', 'oa_file_list.csv'), rankings_file = Path('data', 'scimagojr 2020.csv'), output_pickle = Path('data', "journal_rankings.pickle")):


    with open(pmc_file_list) as f:
        reader = csv.DictReader(tqdm(f, desc="Reading PMC OA file list", unit='lines'))
        rows = list(reader)


    with open(rankings_file) as f:
        reader = csv.DictReader(tqdm(f, desc='Reading rankings', unit='lines'), delimiter=';')
        srows = list(reader)

    pmcid = re.compile(r'PMC[0-9]+')
    def extract_pmcid_journal(row):
        match = pmcid.search(row['File'])
        journal = row['Article Citation'].split('.')[0]
        return match.group(0), journal


    pmcid_2_journal = dict(extract_pmcid_journal(r) for r in rows)
    pmcoa_journals = list(sorted(set(pmcid_2_journal.values())))
    rankings = {s['Title'].lower():s for s in srows}



    maps = list()
    hindex = dict()
    sjr = dict()
    journal_keys = list(sorted(rankings.keys()))

    for j in tqdm(pmcoa_journals, desc='Matching journals to rankings', unit='entries'):
        for key in journal_keys:
            if key.startswith(j.lower()):
                maps.append((j, key))
                data = rankings[key]
                h = float(data['H index'])
                s = data['SJR'].replace(',', '.')
                if s:
                    s = float(s)
                else:
                    s = 0.
                hindex[j] = h
                sjr[j] = s
                break


    with open(output_pickle, 'wb') as f:
        pickle.dump({
            'pmc_to_sjr': maps,
            'journals':pmcid_2_journal,
            'hindex': hindex,
            'sjr':sjr
        }, f)

if __name__ == '__main__':
    plac.call(main)