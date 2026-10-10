"""Top complaints and an extractive summary of a set of reviews."""

from collections import defaultdict

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from src.aspects import ScoredSentence
from src.preprocess import clean_tokens

MIN_SUMMARY_TOKENS = 4  # content words; skips fragments like "Avoid this place."
MMR_LAMBDA = 0.7  # weight on relevance vs. novelty when picking summary sentences


def _normalise(sentence: str) -> str:
    return " ".join(sentence.lower().strip(" .!?").split())


def top_complaints(sentences: list[ScoredSentence], k: int = 5) -> list[dict]:
    """Negative sentences grouped by their normalised text, most repeated (then most negative) first."""
    groups: dict[str, list[ScoredSentence]] = defaultdict(list)
    for sentence in sentences:
        if sentence.label == "negative":
            groups[_normalise(sentence.text)].append(sentence)
    ranked = sorted(groups.values(), key=lambda g: (-len({s.review for s in g}), sum(s.score for s in g) / len(g)))
    return [
        {
            "sentence": group[0].text,
            "review_count": len({s.review for s in group}),
            "score": round(sum(s.score for s in group) / len(group), 4),
            "aspects": list(group[0].aspects),
        }
        for group in ranked[:k]
    ]


def extractive_summary(sentences: list[str], k: int = 3) -> list[str]:
    """Pick k sentences that are typical of the reviews but not repetitive (TF-IDF centroid + MMR).

    Relevance is a sentence's cosine similarity to the mean TF-IDF vector of all sentences. Maximal
    marginal relevance then trades it off against similarity to sentences already picked.
    """
    tokenised = [(sentence, clean_tokens(sentence)) for sentence in sentences]
    candidates = [pair for pair in tokenised if len(pair[1]) >= MIN_SUMMARY_TOKENS]
    if not candidates:  # only short reviews: take any sentence with a content word
        candidates = [pair for pair in tokenised if pair[1]]
    if not candidates:
        return []
    matrix = TfidfVectorizer(analyzer=lambda tokens: tokens).fit_transform([tokens for _, tokens in candidates])
    relevance = cosine_similarity(matrix, np.asarray(matrix.mean(axis=0))).ravel()
    # Highest similarity of each sentence to any pick so far; updated per pick to avoid an n x n matrix.
    redundancy = np.zeros(len(candidates))
    chosen: list[int] = []
    for _ in range(min(k, len(candidates))):
        score = MMR_LAMBDA * relevance - (1 - MMR_LAMBDA) * redundancy
        score[chosen] = -np.inf
        best = int(score.argmax())
        chosen.append(best)
        redundancy = np.maximum(redundancy, cosine_similarity(matrix, matrix[best]).ravel())
    return [candidates[i][0] for i in chosen]
