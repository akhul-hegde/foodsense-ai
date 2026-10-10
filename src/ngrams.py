"""N-gram extraction and frequency counts."""

from collections import Counter


def ngrams(tokens: list[str], n: int) -> list[tuple[str, ...]]:
    """All contiguous n-token windows in a token list."""
    return [tuple(tokens[i : i + n]) for i in range(len(tokens) - n + 1)]


def top_ngrams(docs: list[list[str]], n: int, k: int = 15) -> list[dict]:
    """Most frequent n-grams across documents; n-grams never cross document boundaries."""
    counts = Counter(gram for tokens in docs for gram in ngrams(tokens, n))
    return [{"ngram": " ".join(gram), "count": count} for gram, count in counts.most_common(k)]
