"""POS tag distribution (NLTK), Word2Vec embeddings (gensim) and a classifier on averaged embeddings."""

from collections import Counter

import numpy as np
from gensim.models import Word2Vec
from nltk import pos_tag
from nltk.tag.mapping import map_tag
from sklearn.linear_model import LogisticRegression

from src.basic_stats import InsufficientData, split_sentences, word_tokens
from src.sentiment import label_ratings, stratified_split

# Skip-gram suits small corpora; one worker plus a fixed seed makes training repeatable.
W2V_PARAMS = {"vector_size": 100, "window": 5, "sg": 1, "epochs": 40, "workers": 1, "seed": 42}


def _distribution(counts: Counter) -> list[dict]:
    total = sum(counts.values())
    return [{"tag": tag, "count": count, "share": round(count / total, 4)} for tag, count in counts.most_common()]


def pos_distribution(texts: list[str]) -> dict:
    """Penn Treebank tag counts and the same counts mapped to the 12 universal tags (punctuation excluded)."""
    penn = Counter()
    for text in texts:
        for sentence in split_sentences(text):
            tokens = word_tokens(sentence)  # tag sentence by sentence so the tagger sees real context
            penn.update(tag for _, tag in pos_tag(tokens))
    universal = Counter()
    for tag, count in penn.items():
        universal[map_tag("en-ptb", "universal", tag)] += count
    return {"token_count": sum(penn.values()), "universal": _distribution(universal), "penn": _distribution(penn)}


def train_word2vec(docs: list[list[str]]) -> Word2Vec:
    """Word2Vec on token lists; words seen fewer than twice are dropped unless that leaves almost nothing."""
    docs = [doc for doc in docs if doc]
    if not docs:
        raise InsufficientData("No words to train word embeddings on.")
    for min_count in (2, 1):
        model = Word2Vec(min_count=min_count, **W2V_PARAMS)
        model.build_vocab(docs)
        if len(model.wv) >= 2:
            break
    else:
        raise InsufficientData("Need at least two different words to train word embeddings.")
    model.train(docs, total_examples=model.corpus_count, epochs=model.epochs)
    return model


def nearest_words(model: Word2Vec, term: str, k: int = 10) -> list[dict]:
    """The k words with the highest cosine similarity to `term`; empty if the term is not in the vocabulary."""
    if term not in model.wv:
        return []
    return [{"word": word, "similarity": round(float(sim), 4)} for word, sim in model.wv.most_similar(term, topn=k)]


def doc_vector(model: Word2Vec, tokens: list[str]) -> np.ndarray:
    """Mean of the vectors of the in-vocabulary tokens (zeros when there are none)."""
    known = [model.wv[token] for token in tokens if token in model.wv]
    return np.mean(known, axis=0) if known else np.zeros(model.vector_size, dtype=np.float32)


def embedding_classifier(docs: list[list[str]], ratings: list[float | None]) -> dict:
    """Positive/negative classifier on averaged Word2Vec vectors, with accuracy on a held-out 20%.

    Uses the same rating labels and stratified split as the sentiment endpoint. The embeddings are
    trained on the training reviews only, so test reviews are unseen by every part of the model.
    """
    keep, labels = label_ratings(ratings)
    docs = [docs[i] for i in keep]
    train, test = stratified_split(labels)
    model = train_word2vec([docs[i] for i in train])
    X = np.array([doc_vector(model, doc) for doc in docs])
    y = np.array(labels)
    classifier = LogisticRegression(max_iter=1000).fit(X[train], y[train])
    accuracy = float((classifier.predict(X[test]) == y[test]).mean())
    majority = Counter(y[train]).most_common(1)[0][0]
    return {
        "model": f"LogisticRegression on mean Word2Vec vectors ({model.vector_size} dims)",
        "train_size": len(train),
        "test_size": len(test),
        "accuracy": round(accuracy, 4),
        # Always predicting the training set's most common label; the classifier should beat this.
        "majority_baseline_accuracy": round(float((y[test] == majority).mean()), 4),
    }
