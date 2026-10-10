import math

import pytest

from src.ngram_lm import END, START, UNK, BigramLM, corpus_sentences
from src.ngrams import ngrams, top_ngrams

# Toy corpus from Jurafsky & Martin, ch. 3.
TOY = [["i", "am", "sam"], ["sam", "i", "am"], ["i", "do", "not", "like", "green", "eggs", "and", "ham"]]
V = 12  # 10 word types + </s> + <unk>


@pytest.fixture
def lm() -> BigramLM:
    return BigramLM.train(TOY)


def test_counts(lm: BigramLM) -> None:
    assert lm.bigram_counts[(START, "i")] == 2
    assert lm.bigram_counts[("i", "am")] == 2
    assert lm.context_counts[START] == 3
    assert lm.context_counts["i"] == 3
    assert len(lm.vocab) == V


def test_laplace_probabilities(lm: BigramLM) -> None:
    assert lm.probability(START, "i") == pytest.approx((2 + 1) / (3 + V))
    assert lm.probability("am", END) == pytest.approx((1 + 1) / (2 + V))
    assert lm.probability(START, "ham") == pytest.approx(1 / (3 + V))  # unseen bigram


def test_distribution_sums_to_one(lm: BigramLM) -> None:
    for context in [START, "i", "sam", "ham"]:
        assert sum(lm.probability(context, w) for w in lm.vocab) == pytest.approx(1.0)


def test_sentence_score(lm: BigramLM) -> None:
    result = lm.score(["i", "am"])
    expected = (3 / 15) * (3 / 15) * (2 / 14)
    assert result["tokens"] == [START, "i", "am", END]
    assert result["probability"] == pytest.approx(expected)
    assert result["log_probability"] == pytest.approx(math.log(expected))
    assert [b["bigram"] for b in result["bigrams"]] == [[START, "i"], ["i", "am"], ["am", END]]
    assert [b["count"] for b in result["bigrams"]] == [2, 2, 1]


def test_unknown_words_map_to_unk(lm: BigramLM) -> None:
    result = lm.score(["pizza"])
    assert result["tokens"] == [START, UNK, END]
    assert result["probability"] == pytest.approx((1 / 15) * (1 / V))


def test_corpus_sentences_lowercases_and_splits() -> None:
    assert corpus_sentences(["I am Sam. Sam I am!"]) == [["i", "am", "sam"], ["sam", "i", "am"]]


def test_ngrams() -> None:
    assert ngrams(["a", "b", "c"], 2) == [("a", "b"), ("b", "c")]
    assert ngrams(["a"], 2) == []
    top = top_ngrams([["a", "b", "a", "b"], ["a", "b"]], 2, k=1)
    assert top == [{"ngram": "a b", "count": 3}]
