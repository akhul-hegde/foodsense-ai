"""Basic text statistics: language detection, word/sentence counts, tokenization."""

from collections import Counter

from langdetect import DetectorFactory, LangDetectException, detect
from nltk.tokenize import sent_tokenize, word_tokenize

DetectorFactory.seed = 0  # langdetect is random by default; fix it for repeatable results


class InsufficientData(ValueError):
    """The input is too small or too uniform for an analysis; the message is shown to the user."""


def split_sentences(text: str) -> list[str]:
    """Split text into sentences with NLTK's Punkt model."""
    return sent_tokenize(text)


def tokenize(text: str) -> list[str]:
    """Split text into tokens, punctuation included ("don't" -> "do", "n't")."""
    return word_tokenize(text)


def word_tokens(text: str) -> list[str]:
    """Tokens that contain at least one letter or digit, so punctuation is dropped."""
    return [token for token in tokenize(text) if any(ch.isalnum() for ch in token)]


def detect_language(text: str) -> str:
    """Return the most likely ISO 639-1 language code, or "unknown"."""
    try:
        return detect(text)
    except LangDetectException:  # raised for text with no letters
        return "unknown"


def overview(reviews: list[str]) -> dict:
    """Corpus-level counts, language detection and a tokenization sample from the first review."""
    words = [word_tokens(review) for review in reviews]
    word_count = sum(len(w) for w in words)
    # Detect per review and take the majority, so one long review can't decide the whole dataset.
    per_review = Counter(detect_language(review) for review in reviews)
    language, language_count = per_review.most_common(1)[0]
    sample = reviews[0]
    return {
        "review_count": len(reviews),
        "word_count": word_count,
        "unique_words": len({w.lower() for review in words for w in review}),
        "sentence_count": sum(len(split_sentences(review)) for review in reviews),
        "avg_words_per_review": round(word_count / len(reviews), 2),
        "language": {"code": language, "share": round(language_count / len(reviews), 4)},
        "review_languages": dict(per_review.most_common()),
        "tokenization_sample": {
            "text": sample,
            "sentences": split_sentences(sample),
            "tokens": tokenize(sample),
        },
    }
