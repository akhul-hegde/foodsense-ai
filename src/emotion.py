"""Emotion classification with a DistilRoBERTa model fine-tuned on six emotions plus neutral."""

from collections import Counter

from src import hf

EMOTION_MODEL = "j-hartmann/emotion-english-distilroberta-base"
EMOTIONS = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"]


def emotion_counts(texts: list[str]) -> dict:
    """How many reviews have each emotion as their top label, with the most confident example of each."""
    outputs = hf.classify(EMOTION_MODEL, texts)
    counts = Counter(output["label"] for output in outputs)
    best: dict[str, tuple[float, str]] = {}
    for text, output in zip(texts, outputs):
        if output["score"] > best.get(output["label"], (0.0, ""))[0]:
            best[output["label"]] = (output["score"], text)
    return {
        "model": EMOTION_MODEL,
        "emotions": [
            {
                "emotion": emotion,
                "count": counts[emotion],
                "share": round(counts[emotion] / len(texts), 4) if texts else 0.0,
                "example": best[emotion][1] if emotion in best else None,
            }
            for emotion in EMOTIONS
        ],
    }
