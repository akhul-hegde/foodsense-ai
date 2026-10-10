"""Topic modelling with gensim LDA, scored with c_v topic coherence."""

import math
from collections import Counter

from gensim.corpora import Dictionary
from gensim.models import CoherenceModel, LdaModel

from src.basic_stats import InsufficientData

NUM_TOPICS = 5
TOP_WORDS = 10
SEED = 42


def lda_topics(docs: list[list[str]], num_topics: int = NUM_TOPICS, top_n: int = TOP_WORDS) -> dict:
    """Fit LDA on token lists and return each topic's top words, its share of reviews and the model's coherence."""
    docs = [doc for doc in docs if doc]
    if len(docs) < num_topics:
        raise InsufficientData(f"Need at least {num_topics} non-empty reviews for {num_topics} topics; got {len(docs)}.")
    dictionary = Dictionary(docs)
    # Words in one review only are noise; words in over half the reviews ("food") appear in every topic.
    filtered = Dictionary(docs)
    filtered.filter_extremes(no_below=2, no_above=0.5, keep_n=None)
    if len(filtered) >= num_topics * 2:  # small inputs keep the full vocabulary instead
        dictionary = filtered
    corpus = [dictionary.doc2bow(doc) for doc in docs]
    if sum(len(bow) for bow in corpus) == 0:
        raise InsufficientData("The reviews have no words left to model after preprocessing.")

    model = LdaModel(
        corpus, id2word=dictionary, num_topics=num_topics, passes=10, iterations=100,
        alpha="auto", eta="auto", random_state=SEED,
    )
    # processes=1: c_v otherwise starts worker processes, which is slow and fragile inside a web server.
    coherence = CoherenceModel(model=model, texts=docs, dictionary=dictionary, coherence="c_v", processes=1).get_coherence()
    dominant = Counter(
        max(model.get_document_topics(bow), key=lambda pair: pair[1])[0] for bow in corpus if bow
    )
    reviews = sum(dominant.values())
    return {
        "num_topics": num_topics,
        "doc_count": len(docs),
        "vocab_size": len(dictionary),
        "coherence": {"measure": "c_v", "score": None if math.isnan(coherence) else round(float(coherence), 4)},
        "topics": [
            {
                "id": topic,
                "words": [{"word": word, "weight": round(float(weight), 4)} for word, weight in model.show_topic(topic, top_n)],
                "review_count": dominant[topic],  # reviews where this is the most likely topic
                "share": round(dominant[topic] / reviews, 4) if reviews else 0.0,
            }
            for topic in range(num_topics)
        ],
    }
