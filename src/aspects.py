"""Aspect-based sentiment: find aspects in each sentence with a keyword lexicon, score the sentence with VADER."""

from collections.abc import Callable
from dataclasses import dataclass
from functools import cache

from nltk.sentiment import SentimentIntensityAnalyzer

from src.basic_stats import split_sentences, word_tokens

# Lowercase word forms (not stems), so plurals and tenses are listed explicitly.
LEXICON: dict[str, frozenset[str]] = {
    "food": frozenset({
        "food", "dish", "dishes", "meal", "meals", "taste", "tasted", "tasty", "tasteless", "flavour", "flavor",
        "flavourful", "flavorful", "delicious", "yummy", "bland", "spicy", "salty", "sweet", "sour", "crispy",
        "juicy", "tender", "fresh", "stale", "soggy", "greasy", "oily", "inedible", "cooked", "overcooked",
        "undercooked", "seasoned", "portion", "portions", "menu", "dessert", "desserts", "starter", "starters",
        "appetizer", "appetizers", "cuisine", "breakfast", "lunch", "dinner",
    }),
    "service": frozenset({
        "service", "staff", "waiter", "waiters", "waitress", "waitresses", "server", "servers", "manager",
        "host", "hostess", "served", "serving", "attentive", "rude", "polite", "friendly", "unfriendly", "helpful",
        "unhelpful", "courteous", "hospitality", "wait", "waited", "waiting", "slow", "prompt", "ignored",
    }),
    "ambience": frozenset({
        "ambience", "ambiance", "atmosphere", "decor", "decorated", "interior", "music", "noisy", "noise", "loud",
        "quiet", "cosy", "cozy", "seating", "seats", "crowded", "cramped", "spacious", "lighting", "vibe", "view",
        "setting", "comfortable",
    }),
    "price": frozenset({
        "price", "prices", "priced", "pricey", "pricy", "overpriced", "expensive", "cheap", "affordable",
        "value", "money", "cost", "costs", "costly", "bill", "budget", "reasonable",
    }),
    "cleanliness": frozenset({
        "clean", "cleaned", "cleanliness", "dirty", "filthy", "hygiene", "hygienic", "unhygienic", "sticky",
        "smell", "smelled", "smelly", "stinks", "spotless", "messy", "dusty", "stain", "stained", "cockroach",
        "cockroaches", "flies", "washroom", "restroom", "toilet", "toilets",
    }),
}
ASPECTS = list(LEXICON)

# VADER's recommended cut-offs on its compound score (-1 to 1).
POSITIVE_THRESHOLD = 0.05
NEGATIVE_THRESHOLD = -0.05

Scorer = Callable[[str], float]


@dataclass(frozen=True)
class ScoredSentence:
    review: int  # position of the review in the input list
    text: str
    score: float  # -1 (negative) to 1 (positive)
    label: str
    aspects: tuple[str, ...]


@cache
def _vader() -> SentimentIntensityAnalyzer:
    return SentimentIntensityAnalyzer()


def is_opinion_word(word: str) -> bool:
    """Whether VADER's lexicon gives the word a sentiment ("great", "worst")."""
    return word.lower() in _vader().lexicon


def vader_score(sentence: str) -> float:
    return _vader().polarity_scores(sentence)["compound"]


def label_score(score: float) -> str:
    if score >= POSITIVE_THRESHOLD:
        return "positive"
    if score <= NEGATIVE_THRESHOLD:
        return "negative"
    return "neutral"


def find_aspects(sentence: str) -> tuple[str, ...]:
    """Every aspect with at least one keyword in the sentence, in lexicon order."""
    words = {token.lower() for token in word_tokens(sentence)}
    return tuple(aspect for aspect, keywords in LEXICON.items() if words & keywords)


def score_sentences(texts: list[str], scorer: Scorer = vader_score) -> list[ScoredSentence]:
    """Split each review into sentences; score every sentence and tag it with the aspects it mentions."""
    scored = []
    for review, text in enumerate(texts):
        for sentence in split_sentences(text):
            score = scorer(sentence)
            scored.append(ScoredSentence(review, sentence, score, label_score(score), find_aspects(sentence)))
    return scored


def aspect_summary(sentences: list[ScoredSentence]) -> list[dict]:
    """Per aspect: sentence and review counts, positive/negative/neutral counts, mean score and extreme examples.

    A sentence that mentions two aspects ("great food but rude staff") counts toward both with the same score.
    """
    result = []
    for aspect in ASPECTS:
        hits = [s for s in sentences if aspect in s.aspects]
        counts = {label: sum(1 for s in hits if s.label == label) for label in ("positive", "negative", "neutral")}
        best = max(hits, key=lambda s: s.score, default=None)
        worst = min(hits, key=lambda s: s.score, default=None)
        result.append({
            "aspect": aspect,
            "mentions": len(hits),
            "reviews": len({s.review for s in hits}),
            **counts,
            "avg_score": round(sum(s.score for s in hits) / len(hits), 4) if hits else None,
            # (positive - negative) / mentions: +1 all praise, -1 all complaints.
            "net_sentiment": round((counts["positive"] - counts["negative"]) / len(hits), 4) if hits else None,
            "examples": {
                "positive": best.text if best and best.label == "positive" else None,
                "negative": worst.text if worst and worst.label == "negative" else None,
            },
        })
    return result
