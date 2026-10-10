import pytest

from src.aspects import aspect_summary, find_aspects, label_score, score_sentences


def by_aspect(summary: list[dict]) -> dict[str, dict]:
    return {row["aspect"]: row for row in summary}


def test_find_aspects_matches_keywords_case_insensitively() -> None:
    assert find_aspects("The WAITER was rude but the food was delicious.") == ("food", "service")
    assert find_aspects("Overpriced, and the tables were sticky.") == ("price", "cleanliness")
    assert find_aspects("Lovely music and a cosy vibe.") == ("ambience",)
    assert find_aspects("We went on Tuesday.") == ()


@pytest.mark.parametrize("score, label", [
    (0.05, "positive"), (0.9, "positive"), (-0.05, "negative"), (-0.9, "negative"), (0.0, "neutral"), (0.049, "neutral"),
])
def test_label_score_thresholds(score: float, label: str) -> None:
    assert label_score(score) == label


def test_score_sentences_splits_reviews_and_keeps_review_index() -> None:
    scored = score_sentences(["Great food. Rude staff.", "Nice decor."], scorer=lambda s: 0.5)
    assert [(s.review, s.text, s.aspects) for s in scored] == [
        (0, "Great food.", ("food",)),
        (0, "Rude staff.", ("service",)),
        (1, "Nice decor.", ("ambience",)),
    ]


def test_aspect_summary_counts_and_scores() -> None:
    fake_scores = {
        "The food was great.": 0.8,
        "The food was cold.": -0.4,
        "Our meal was fine.": 0.0,
        "Rude staff and dirty tables.": -0.6,  # two aspects: counts for service and cleanliness
    }
    scored = score_sentences(
        ["The food was great. Rude staff and dirty tables.", "The food was cold. Our meal was fine."],
        scorer=fake_scores.__getitem__,
    )
    summary = by_aspect(aspect_summary(scored))

    food = summary["food"]
    assert (food["mentions"], food["reviews"]) == (3, 2)
    assert (food["positive"], food["negative"], food["neutral"]) == (1, 1, 1)
    assert food["avg_score"] == round((0.8 - 0.4 + 0.0) / 3, 4)
    assert food["net_sentiment"] == 0.0
    assert food["examples"] == {"positive": "The food was great.", "negative": "The food was cold."}

    for aspect in ("service", "cleanliness"):
        row = summary[aspect]
        assert (row["mentions"], row["negative"], row["net_sentiment"]) == (1, 1, -1.0)
        assert row["examples"] == {"positive": None, "negative": "Rude staff and dirty tables."}

    price = summary["price"]
    assert price["mentions"] == 0 and price["avg_score"] is None and price["net_sentiment"] is None


def test_aspect_summary_lists_every_aspect_even_without_input() -> None:
    assert [row["aspect"] for row in aspect_summary([])] == ["food", "service", "ambience", "price", "cleanliness"]


def test_vader_scoring_handles_negation() -> None:
    scored = score_sentences(["The food was delicious. The food was not fresh. The staff were rude."])
    assert [(s.aspects, s.label) for s in scored] == [
        (("food",), "positive"),
        (("food",), "negative"),
        (("service",), "negative"),
    ]
