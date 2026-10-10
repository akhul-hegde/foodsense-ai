"""Hugging Face text classifiers, loaded on first use, cached for the process and run on CPU."""

import threading
from functools import cache

# Transformers on CPU take roughly 20-50 ms per review, so each request scores at most this many.
MAX_REVIEWS = 300
BATCH_SIZE = 16

_lock = threading.Lock()  # FastAPI runs sync routes in a thread pool; load each model only once


class ModelUnavailable(RuntimeError):
    """The model could not be downloaded or loaded."""


def text_classifier(model_name: str):
    with _lock:
        return _load(model_name)


@cache
def _load(model_name: str):
    from transformers import pipeline  # imported here: importing torch adds seconds to app startup

    try:
        return pipeline("text-classification", model=model_name, device="cpu")
    except OSError as exc:  # no network on first use, or a broken download in the cache
        raise ModelUnavailable(f"Could not load the Hugging Face model {model_name}: {exc}") from exc


def classify(model_name: str, texts: list[str]) -> list[dict]:
    """Top label and score for each text; texts longer than the model's limit are truncated."""
    if not texts:
        return []
    return text_classifier(model_name)(texts, truncation=True, batch_size=BATCH_SIZE)
