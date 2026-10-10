"""TF-IDF keyword extraction."""

from sklearn.feature_extraction.text import TfidfVectorizer


def top_terms(docs: list[list[str]], k: int = 20) -> list[dict]:
    """Rank terms by their mean TF-IDF weight across documents (each doc is a token list)."""
    docs = [doc for doc in docs if doc]
    if not docs:
        return []
    vectorizer = TfidfVectorizer(analyzer=lambda tokens: tokens)  # input is already tokenized
    matrix = vectorizer.fit_transform(docs)
    mean_scores = matrix.mean(axis=0).A1
    doc_counts = (matrix > 0).sum(axis=0).A1
    terms = vectorizer.get_feature_names_out()
    best = mean_scores.argsort()[::-1][:k]
    return [
        {"term": terms[i], "score": round(float(mean_scores[i]), 4), "doc_count": int(doc_counts[i])}
        for i in best
    ]
