"""Text cleaning, stopword removal, stemming (Porter) and lemmatization (WordNet)."""

import os
import re
from functools import cache

import certifi
import nltk
from nltk import pos_tag
from nltk.corpus import stopwords, wordnet
from nltk.stem import PorterStemmer, WordNetLemmatizer

from src.basic_stats import detect_language, word_tokens

# NLTK data packages this project needs, keyed by the path nltk.data.find looks for.
NLTK_RESOURCES = {
    "tokenizers/punkt_tab": "punkt_tab",
    "corpora/stopwords": "stopwords",
    "corpora/wordnet.zip": "wordnet",
    "taggers/averaged_perceptron_tagger_eng": "averaged_perceptron_tagger_eng",
    "taggers/universal_tagset": "universal_tagset",
    "sentiment/vader_lexicon.zip": "vader_lexicon",
}

# Negations flip sentiment ("not fresh"), so they are kept even though NLTK lists them as stopwords.
NEGATIONS = {"no", "not", "nor", "never"}

URL_PATTERN = re.compile(r"https?://\S+|www\.\S+")

# langdetect guesses wrong on very short texts ("Good food" -> Somali), so below this many words
# a text counts as English when most of its words are English stopwords or WordNet entries.
SHORT_TEXT_WORDS = 5

_stemmer = PorterStemmer()
_lemmatizer = WordNetLemmatizer()


def ensure_nltk_data() -> None:
    """Download any missing NLTK data packages (first run only)."""
    # python.org macOS builds ship without CA certificates; use certifi's bundle for the download.
    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
    for path, package in NLTK_RESOURCES.items():
        try:
            nltk.data.find(path)
        except LookupError:
            nltk.download(package, quiet=True)


@cache
def stopword_set() -> frozenset[str]:
    """English stopwords minus negations."""
    return frozenset(stopwords.words("english")) - NEGATIONS


def is_english(text: str) -> bool:
    """True for English text; False for other languages and for text with no words."""
    words = [w.lower() for w in word_tokens(URL_PATTERN.sub(" ", text)) if w.isalpha()]
    if not words:
        return False
    if len(words) >= SHORT_TEXT_WORDS:
        return detect_language(text) == "en"
    known = sum(1 for w in words if w in stopword_set() or w in NEGATIONS or wordnet.synsets(w))
    return known / len(words) > 0.5


def clean_tokens(text: str) -> list[str]:
    """Lowercase, strip URLs, keep alphabetic words, expand "n't" to "not", drop stopwords."""
    text = URL_PATTERN.sub(" ", text.lower())
    tokens = ["not" if token == "n't" else token for token in word_tokens(text)]
    return [token for token in tokens if token.isalpha() and token not in stopword_set()]


def stem_tokens(tokens: list[str]) -> list[str]:
    """Chop words to their Porter stem ("amazing" -> "amaz")."""
    return [_stemmer.stem(token) for token in tokens]


def _wordnet_pos(treebank_tag: str) -> str:
    """Map a Penn Treebank POS tag to the WordNet POS the lemmatizer expects."""
    return {"J": wordnet.ADJ, "V": wordnet.VERB, "R": wordnet.ADV}.get(treebank_tag[0], wordnet.NOUN)


def lemmatize_tokens(tokens: list[str]) -> list[str]:
    """Reduce words to their dictionary form, using POS tags ("was" -> "be", "dishes" -> "dish")."""
    # Pronouns stay as they are: WordNet would read "us" as the noun plural of "u".
    return [
        token if tag.startswith("PRP") else _lemmatizer.lemmatize(token, _wordnet_pos(tag))
        for token, tag in pos_tag(tokens)
    ]


def preprocess_review(text: str) -> dict:
    """Original, cleaned, stemmed and lemmatized versions of one review, plus a per-token table."""
    tokens = clean_tokens(text)
    stems = stem_tokens(tokens)
    lemmas = lemmatize_tokens(tokens)
    return {
        "original": text,
        "cleaned": " ".join(tokens),
        "stemmed": " ".join(stems),
        "lemmatized": " ".join(lemmas),
        "tokens": [
            {"token": token, "stem": stem, "lemma": lemma}
            for token, stem, lemma in zip(tokens, stems, lemmas)
        ],
    }
