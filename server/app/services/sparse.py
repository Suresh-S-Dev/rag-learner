import math
import re

TOKEN = re.compile(r"[a-z0-9]+")
STOP = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "has",
    "have",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "was",
    "were",
    "with",
}


def tokens(text: str) -> list[str]:
    return TOKEN.findall(text.lower())


def entities(text: str) -> set[str]:
    return {item for item in tokens(text) if item not in STOP and len(item) > 2}


def bm25_scores(query: str, docs: list[str], k1: float = 1.5, b: float = 0.75) -> list[float]:
    terms = tokens(query)
    if not terms:
        return [0.0] * len(docs)
    bags = [tokens(doc) for doc in docs]
    count = len(bags)
    avgdl = sum(len(bag) for bag in bags) / max(count, 1)
    df: dict[str, int] = {}
    for bag in bags:
        for term in set(bag):
            df[term] = df.get(term, 0) + 1
    scores = []
    for bag in bags:
        tf: dict[str, int] = {}
        for term in bag:
            tf[term] = tf.get(term, 0) + 1
        score = 0.0
        length = len(bag) or 1
        for term in terms:
            if term not in df:
                continue
            idf = math.log(1 + (count - df[term] + 0.5) / (df[term] + 0.5))
            freq = tf.get(term, 0)
            score += idf * (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * length / avgdl))
        scores.append(score)
    return scores
