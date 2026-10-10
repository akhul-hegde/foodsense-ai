"""Bigram language model with Laplace (add-one) smoothing."""

import math
from collections import Counter
from dataclasses import dataclass

from src.basic_stats import split_sentences, word_tokens

START, END, UNK = "<s>", "</s>", "<unk>"


def sentence_tokens(text: str) -> list[str]:
    """Lowercased word tokens of a single sentence."""
    return [token.lower() for token in word_tokens(text)]


def corpus_sentences(texts: list[str]) -> list[list[str]]:
    """Split every text into sentences and tokenize each one."""
    return [sentence_tokens(s) for text in texts for s in split_sentences(text) if sentence_tokens(s)]


def pad(tokens: list[str]) -> list[str]:
    """Wrap a sentence in start/end markers."""
    return [START, *tokens, END]


@dataclass(frozen=True)
class BigramLM:
    bigram_counts: Counter
    context_counts: Counter  # how often each word appears as the first half of a bigram
    vocab: frozenset[str]  # every word the model can predict: training words + </s> + <unk>

    @classmethod
    def train(cls, sentences: list[list[str]]) -> "BigramLM":
        bigrams = Counter(
            (prev, word) for tokens in sentences for prev, word in zip(pad(tokens), pad(tokens)[1:])
        )
        contexts = Counter()
        for (prev, _), count in bigrams.items():
            contexts[prev] += count
        vocab = frozenset(word for tokens in sentences for word in tokens) | {END, UNK}
        return cls(bigrams, contexts, vocab)

    def probability(self, prev: str, word: str) -> float:
        """P(word | prev) = (C(prev word) + 1) / (C(prev) + V)."""
        return (self.bigram_counts[(prev, word)] + 1) / (self.context_counts[prev] + len(self.vocab))

    def score(self, tokens: list[str]) -> dict:
        """Sentence probability, natural-log probability and the factor from each bigram."""
        known = [token if token in self.vocab else UNK for token in tokens]
        padded = pad(known)
        breakdown = []
        log_prob = 0.0
        for prev, word in zip(padded, padded[1:]):
            p = self.probability(prev, word)
            log_prob += math.log(p)
            breakdown.append({
                "bigram": [prev, word],
                "count": self.bigram_counts[(prev, word)],
                "context_count": self.context_counts[prev],
                "probability": p,
            })
        return {
            "tokens": padded,
            "probability": math.exp(log_prob),
            "log_probability": log_prob,
            "vocab_size": len(self.vocab),
            "bigrams": breakdown,
        }
