from functools import lru_cache

import spacy
from spacy.matcher import PhraseMatcher, Matcher

import itertools as it

nlp = spacy.load("en_core_web_sm")

negation_phrases = ["play no", "play little", "is not", "be insufficient", "fail not"]
strongLemmas = ["higher", "positively", "increase", "elevated"]
weakLemmas = ["lower", "negatively", "decrease", "reduce"]


def make_matcher(data):
    for name, phrases in data.items():
        docs = [nlp(text) for text in phrases]
        patterns = list()
        for doc in docs:
            pattern = []
            for token in doc:
                pattern.append({'LEMMA': token.lemma_})
            patterns.append(pattern)
        # matcher = PhraseMatcher(nlp.vocab)
        matcher = Matcher(nlp.vocab)
        matcher.add(name, patterns)

    return matcher


matcher = make_matcher({"Negations": negation_phrases, "Weak": weakLemmas, "Strong": strongLemmas})


def pipe_sentences(sents):
    return [annotate_sentence(s) for s in sents]


@lru_cache(maxsize=5000)
def annotate_sentence(sent:str):
    return nlp(sent)


@lru_cache(maxsize=5000)
def make_text(doc):
    matches = matcher(doc)
    current_match = None
    ret = list()
    for ix, token in enumerate(doc):
        if current_match is None:
            if len(matches) > 0:
                current_match = matches[0]
                matches = matches[1:]
            else:
                ret.append(token.text)
                continue

        match_id, start, end = current_match
        if ix == start:
            ret.append(f'<span class="{nlp.vocab[match_id].text}">{token.text}')
        elif ix == end:
            ret.append('</span>')
            ret.append(token.text)
            current_match = None
        else:
            ret.append(token.text)

    return " ".join(ret)
