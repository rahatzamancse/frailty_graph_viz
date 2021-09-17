from tqdm import tqdm
import pandas as pd
import csv
import re
import pickle

def main(pmc_file_list = '/Users/enrique//Downloads/oa_file_list.csv', rankings_file = '/Users/enrique/Downloads/scimagojr 2020.csv', output_pickle = "journal_rankings.pickle"):


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
        j = j.lower()
        for key in journal_keys:
            if key.startswith(j):
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
            'hindex': hindex,
            'sjr':sjr
        }, f)

if __name__ == '__main__':
    main()