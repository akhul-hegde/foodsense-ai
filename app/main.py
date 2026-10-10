"""FoodSense AI API: load restaurant reviews and run basic NLP analyses on them."""

import csv
import io
import random
from collections import defaultdict
from collections.abc import Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import APIRouter, FastAPI, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from src import (
    aspects, basic_stats, emotion, hf, ner, ngrams, pos_embed, preprocess, scraper, sentiment, summary, tfidf, topics,
)
from src.ngram_lm import BigramLM, corpus_sentences, sentence_tokens

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "reviews.csv"
FRONTEND_ORIGIN = "http://localhost:5173"


@dataclass(frozen=True)
class Review:
    restaurant: str
    text: str
    rating: float | None


@dataclass(frozen=True)
class Dataset:
    name: str
    source: str  # "csv", "upload", "paste" or "scrape"
    reviews: list[Review]

    @property
    def texts(self) -> list[str]:
        return [review.text for review in self.reviews]


class Store:
    """The server's in-memory state: the loaded corpus, the current dataset and a results cache."""

    def __init__(self) -> None:
        self.corpus: list[Review] = []  # all rows from the CSV file or the last upload
        self.corpus_source = "csv"
        self.dataset = Dataset("empty", "csv", [])
        self._cache: dict[str, Any] = {}

    def use(self, dataset: Dataset) -> dict:
        """Make a dataset current and drop results computed for the previous one."""
        if not dataset.reviews:
            raise HTTPException(400, "The dataset has no reviews.")
        self.dataset = dataset
        self._cache.clear()
        return {"name": dataset.name, "source": dataset.source, "review_count": len(dataset.reviews)}

    def cached(self, key: str, compute: Callable[[], Any]) -> Any:
        """Compute a result once per dataset."""
        if key not in self._cache:
            self._cache[key] = compute()
        return self._cache[key]


store = Store()


def parse_csv(text: str) -> list[Review]:
    """Read rows with a required "review" column and optional "restaurant" and "rating" columns."""
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames or "review" not in reader.fieldnames:
        raise HTTPException(400, 'The CSV needs a "review" column (optional: "restaurant", "rating").')
    reviews = []
    for line, row in enumerate(reader, start=2):  # line 1 is the header
        text = (row.get("review") or "").strip()
        if not text:
            continue
        rating = (row.get("rating") or "").strip()
        try:
            value = float(rating) if rating else None
        except ValueError:
            raise HTTPException(400, f'Line {line}: rating "{rating}" is not a number.')
        restaurant = (row.get("restaurant") or "").strip() or "Unknown"
        reviews.append(Review(restaurant, text, value))
    return reviews


def load_corpus(reviews: list[Review], name: str, source: str) -> dict:
    """Replace the corpus and make all of it the current dataset."""
    summary = store.use(Dataset(name, source, reviews))
    store.corpus = reviews
    store.corpus_source = source
    return summary


@asynccontextmanager
async def lifespan(_: FastAPI):
    preprocess.ensure_nltk_data()
    load_corpus(parse_csv(DATA_FILE.read_text(encoding="utf-8")), "All restaurants", "csv")
    yield


app = FastAPI(title="FoodSense AI", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[FRONTEND_ORIGIN], allow_methods=["*"], allow_headers=["*"])
api = APIRouter(prefix="/api")


# ---- Cached per-dataset results ----

def clean_docs() -> list[list[str]]:
    return store.cached("clean", lambda: [preprocess.clean_tokens(t) for t in store.dataset.texts])


def lemma_docs() -> list[list[str]]:
    return store.cached("lemmas", lambda: [preprocess.lemmatize_tokens(doc) for doc in clean_docs()])


def language_model() -> BigramLM:
    return store.cached("lm", lambda: BigramLM.train(corpus_sentences(store.dataset.texts)))


# ---- Dataset selection ----

class SelectBody(BaseModel):
    restaurant: str


class PasteBody(BaseModel):
    text: str


class ScrapeBody(BaseModel):
    url: HttpUrl  # rejects non-http(s) URLs with a 422 before any request is made


class SentenceBody(BaseModel):
    sentence: str


@api.get("/restaurants")
def list_restaurants() -> list[dict]:
    groups: dict[str, list[Review]] = defaultdict(list)
    for review in store.corpus:
        groups[review.restaurant].append(review)
    result = []
    for name, reviews in sorted(groups.items()):
        ratings = [r.rating for r in reviews if r.rating is not None]
        avg = round(sum(ratings) / len(ratings), 2) if ratings else None
        result.append({"name": name, "review_count": len(reviews), "avg_rating": avg})
    return result


@api.get("/data/current")
def current_dataset() -> dict:
    dataset = store.dataset
    return {"name": dataset.name, "source": dataset.source, "review_count": len(dataset.reviews)}


@api.post("/data/select")
def select_restaurant(body: SelectBody) -> dict:
    reviews = [r for r in store.corpus if r.restaurant == body.restaurant]
    if not reviews:
        raise HTTPException(404, f'No reviews found for restaurant "{body.restaurant}".')
    return store.use(Dataset(body.restaurant, store.corpus_source, reviews))


@api.post("/data/upload")
async def upload_csv(file: UploadFile) -> dict:
    try:
        text = (await file.read()).decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(400, "The file must be UTF-8 encoded CSV.")
    return load_corpus(parse_csv(text), file.filename or "Uploaded CSV", "upload")


@api.post("/data/paste")
def paste_text(body: PasteBody) -> dict:
    # One review per non-empty line.
    reviews = [Review("Pasted text", line.strip(), None) for line in body.text.splitlines() if line.strip()]
    return store.use(Dataset("Pasted text", "paste", reviews))


@api.post("/data/scrape")
def scrape_url(body: ScrapeBody) -> dict:
    url = str(body.url)
    try:
        texts = scraper.scrape_reviews(url)
    except scraper.ScrapeError as exc:
        raise HTTPException(502, str(exc))
    return store.use(Dataset(url, "scrape", [Review(url, t, None) for t in texts]))


# ---- Analyses ----

@api.get("/overview")
def overview() -> dict:
    return store.cached("overview", lambda: basic_stats.overview(store.dataset.texts))


@api.get("/preprocess")
def preprocess_one(i: int = Query(0, ge=0)) -> dict:
    count = len(store.dataset.reviews)
    if i >= count:
        raise HTTPException(404, f"Review index {i} is out of range (dataset has {count} reviews).")
    result = store.cached(f"preprocess:{i}", lambda: preprocess.preprocess_review(store.dataset.texts[i]))
    return {"index": i, "count": count, **result}


@api.get("/keywords")
def keywords(k: int = Query(20, ge=1, le=100)) -> dict:
    # Lemmas group inflected forms ("dish"/"dishes") into one keyword.
    return {"terms": store.cached(f"keywords:{k}", lambda: tfidf.top_terms(lemma_docs(), k))}


@api.get("/phrases")
def phrases(k: int = Query(15, ge=1, le=100)) -> dict:
    # Surface forms (not lemmas) keep phrases readable.
    return store.cached(f"phrases:{k}", lambda: {
        "bigrams": ngrams.top_ngrams(clean_docs(), 2, k),
        "trigrams": ngrams.top_ngrams(clean_docs(), 3, k),
    })


@api.post("/lm/probability")
def sentence_probability(body: SentenceBody) -> dict:
    tokens = sentence_tokens(body.sentence)
    if not tokens:
        raise HTTPException(400, "The sentence has no words.")
    return {"sentence": body.sentence, **language_model().score(tokens)}


# ---- English-only analyses (models and lexicons below are English) ----

def english_positions() -> list[int]:
    return store.cached("english", lambda: [i for i, t in enumerate(store.dataset.texts) if preprocess.is_english(t)])


def english_input() -> tuple[list[Review], list[str]]:
    """The current dataset's English reviews, and notes for the response (a fresh list per request)."""
    positions = english_positions()
    total = len(store.dataset.reviews)
    if not positions:
        raise HTTPException(422, f"None of the {total} reviews contain English text; this analysis supports English only.")
    notes = []
    if len(positions) < total:
        notes.append(f"Skipped {total - len(positions)} of {total} reviews that are not in English or have no words.")
    return [store.dataset.reviews[i] for i in positions], notes


def english_clean_docs() -> list[list[str]]:
    docs = clean_docs()
    return [docs[i] for i in english_positions()]


def english_lemma_docs() -> list[list[str]]:
    docs = lemma_docs()
    return [docs[i] for i in english_positions()]


def analysis(key: str, compute: Callable[[], Any], notes: list[str]) -> Any:
    """A cached result; too little data becomes a 422 and a missing model a 503 instead of a 500."""
    try:
        return store.cached(key, compute)
    except basic_stats.InsufficientData as exc:
        raise HTTPException(422, " ".join([str(exc), *notes]))
    except (hf.ModelUnavailable, ner.ModelNotInstalled) as exc:
        raise HTTPException(503, str(exc))


def transformer_sample(texts: list[str], notes: list[str]) -> tuple[list[str], dict]:
    """At most hf.MAX_REVIEWS texts (a fixed random sample when there are more), noting any cut."""
    limit = hf.MAX_REVIEWS
    used = texts
    if len(texts) > limit:
        used = [texts[i] for i in sorted(random.Random(0).sample(range(len(texts)), limit))]
        notes.append(f"Transformer inference is capped at {limit} reviews on CPU: "
                     f"scored a random sample of {limit} of {len(texts)} reviews.")
    return used, {"limit": limit, "used": len(used), "total": len(texts), "capped": len(used) < len(texts)}


def scored_sentences() -> list[aspects.ScoredSentence]:
    reviews, _ = english_input()
    return store.cached("sentences", lambda: aspects.score_sentences([r.text for r in reviews]))


@api.get("/linguistics")
def linguistics(term: str = Query("food", description="Word to find neighbours for"), k: int = Query(10, ge=1, le=50)) -> dict:
    reviews, notes = english_input()
    pos = analysis("pos", lambda: pos_embed.pos_distribution([r.text for r in reviews]), notes)
    model = analysis("w2v", lambda: pos_embed.train_word2vec(english_clean_docs()), notes)
    query = term.strip().lower()
    nearest = pos_embed.nearest_words(model, query, k)
    if not nearest:
        notes.append(f'"{query}" is not in the Word2Vec vocabulary (stopwords and words seen fewer than '
                     f'{model.min_count} times are left out).')
    try:
        classifier = store.cached("w2v_classifier", lambda: pos_embed.embedding_classifier(
            english_clean_docs(), [r.rating for r in reviews]))
    except basic_stats.InsufficientData as exc:
        classifier = None
        notes.append(f"Embedding classifier skipped: {exc}")
    return {
        "reviews_analysed": len(reviews),
        "pos": pos,
        "word2vec": {
            "vocab_size": len(model.wv),
            "vector_size": model.vector_size,
            "query": query,
            "in_vocab": query in model.wv,
            "nearest": nearest,
        },
        "classifier": classifier,
        "notes": notes,
    }


@api.get("/entities")
def entities() -> dict:
    reviews, notes = english_input()
    result = analysis("entities", lambda: ner.analyse([r.text for r in reviews]), notes)
    return {"reviews_analysed": len(reviews), **result, "notes": notes}


@api.get("/topics")
def topic_model() -> dict:
    reviews, notes = english_input()
    result = analysis("topics", lambda: topics.lda_topics(english_lemma_docs()), notes)
    return {"reviews_analysed": len(reviews), **result, "notes": notes}


@api.get("/sentiment")
def sentiment_comparison() -> dict:
    reviews, notes = english_input()
    result = analysis("sentiment", lambda: sentiment.compare([r.text for r in reviews], [r.rating for r in reviews]), notes)
    if result["dropped"]:
        notes.append(f"Dropped {result['dropped']} reviews rated between 2 and 4 stars or with no rating (labels: >= 4 positive, <= 2 negative).")
    if result["capped"]:
        notes.append(f"Transformer inference is capped at {hf.MAX_REVIEWS} reviews on CPU: both models were scored "
                     f"on the same {result['evaluated']} of {result['test_size']} held-out reviews.")
    inference = {"limit": hf.MAX_REVIEWS, "used": result["evaluated"], "total": result["test_size"], "capped": result["capped"]}
    return {"reviews_analysed": len(reviews), **result, "inference": inference, "notes": notes}


@api.get("/emotion")
def emotions() -> dict:
    reviews, notes = english_input()
    texts, inference = transformer_sample([r.text for r in reviews], notes)
    result = analysis("emotion", lambda: emotion.emotion_counts(texts), notes)
    return {"reviews_analysed": len(texts), **result, "inference": inference, "notes": notes}


@api.get("/aspects")
def aspect_sentiment() -> dict:
    reviews, notes = english_input()
    sentences = scored_sentences()
    return {
        "reviews_analysed": len(reviews),
        "sentence_count": len(sentences),
        "sentences_without_aspect": sum(1 for s in sentences if not s.aspects),
        "scorer": "VADER compound score per sentence (>= 0.05 positive, <= -0.05 negative)",
        "aspects": store.cached("aspects", lambda: aspects.aspect_summary(sentences)),
        "notes": notes,
    }


@api.get("/summary")
def review_summary(k: int = Query(5, ge=1, le=20), sentences: int = Query(3, ge=1, le=10)) -> dict:
    reviews, notes = english_input()
    scored = scored_sentences()
    found = analysis("entities", lambda: ner.analyse([r.text for r in reviews]), notes)
    return {
        "reviews_analysed": len(reviews),
        "top_dishes": found["dishes"][:k],
        "top_complaints": summary.top_complaints(scored, k),
        "summary": store.cached(f"summary:{sentences}", lambda: summary.extractive_summary([s.text for s in scored], sentences)),
        "notes": notes,
    }


app.include_router(api)
