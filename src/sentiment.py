"""Sentiment from star ratings: TF-IDF + logistic regression baseline vs DistilBERT fine-tuned on SST-2."""

import math
from collections import Counter

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline

from src import hf
from src.basic_stats import InsufficientData

POSITIVE, NEGATIVE = "positive", "negative"
LABELS = [NEGATIVE, POSITIVE]  # confusion matrix row/column order
TEST_SIZE = 0.2
SEED = 42
SST2_MODEL = "distilbert-base-uncased-finetuned-sst-2-english"


def label_from_rating(rating: float | None) -> str | None:
    """4-5 stars is positive, 1-2 is negative; 3 stars (anything between 2 and 4) and missing ratings are dropped."""
    if rating is None:
        return None
    if rating >= 4:
        return POSITIVE
    if rating <= 2:
        return NEGATIVE
    return None


def label_ratings(ratings: list[float | None]) -> tuple[list[int], list[str]]:
    """Positions and labels of the items whose rating gives a label."""
    pairs = [(i, label_from_rating(r)) for i, r in enumerate(ratings)]
    kept = [(i, label) for i, label in pairs if label]
    return [i for i, _ in kept], [label for _, label in kept]


def stratified_split(labels: list[str], test_size: float = TEST_SIZE, seed: int = SEED) -> tuple[list[int], list[int]]:
    """Train and test positions with each label's share kept the same in both parts."""
    counts = Counter(labels)
    if not counts:
        raise InsufficientData("No reviews have a 1-2 or 4-5 star rating, so there are no sentiment labels.")
    if len(counts) < 2:
        raise InsufficientData(f"Need both positive (4-5 star) and negative (1-2 star) reviews; found only {next(iter(counts))} ones.")
    if min(counts.values()) < 2:
        raise InsufficientData(f"Need at least 2 reviews of each label for a stratified split; got {dict(counts)}.")
    n_test = math.ceil(test_size * len(labels))  # how scikit-learn rounds
    if n_test < len(counts) or len(labels) - n_test < len(counts):
        raise InsufficientData(f"{len(labels)} labelled reviews are too few for a {1 - test_size:.0%}/{test_size:.0%} split.")
    train, test = train_test_split(
        list(range(len(labels))), test_size=test_size, stratify=labels, random_state=seed
    )
    return train, test


def evaluate(y_true: list[str], y_pred: list[str]) -> dict:
    """Accuracy, macro-averaged precision/recall/F1 and a confusion matrix (rows = true, columns = predicted)."""
    scores = {
        name: round(float(fn(y_true, y_pred, labels=LABELS, average="macro", zero_division=0)), 4)
        for name, fn in [("precision", precision_score), ("recall", recall_score), ("f1", f1_score)]
    }
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        **scores,
        "average": "macro",
        "confusion_matrix": {"labels": LABELS, "matrix": confusion_matrix(y_true, y_pred, labels=LABELS).tolist()},
    }


def train_baseline(texts: list[str], labels: list[str]):
    """TF-IDF over words and word pairs (keeps "not good"), then logistic regression."""
    model = make_pipeline(TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True), LogisticRegression(max_iter=1000))
    return model.fit(texts, labels)


def transformer_predict(texts: list[str]) -> list[str]:
    return [output["label"].lower() for output in hf.classify(SST2_MODEL, texts)]


def compare(texts: list[str], ratings: list[float | None], limit: int = hf.MAX_REVIEWS) -> dict:
    """Train the baseline on 80% of the labelled reviews and score both models on the held-out 20%.

    The transformer is used off the shelf (no training). If the test set has more than `limit`
    reviews, both models are scored on the same first `limit` test reviews so they stay comparable.
    """
    keep, labels = label_ratings(ratings)
    texts = [texts[i] for i in keep]
    train, test = stratified_split(labels)
    baseline = train_baseline([texts[i] for i in train], [labels[i] for i in train])
    scored = test[:limit]  # the split is already shuffled
    test_texts = [texts[i] for i in scored]
    y_true = [labels[i] for i in scored]
    return {
        "labelled": len(labels),
        "dropped": len(ratings) - len(labels),
        "label_counts": dict(Counter(labels)),
        "train_size": len(train),
        "test_size": len(test),
        "evaluated": len(scored),
        "capped": len(scored) < len(test),
        "baseline": {"model": "TF-IDF (1-2 grams) + LogisticRegression", **evaluate(y_true, list(baseline.predict(test_texts)))},
        "transformer": {"model": SST2_MODEL, **evaluate(y_true, transformer_predict(test_texts))},
    }
