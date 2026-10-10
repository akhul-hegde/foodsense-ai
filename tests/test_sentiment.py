from collections import Counter

import pytest

from src.basic_stats import InsufficientData
from src.sentiment import NEGATIVE, POSITIVE, evaluate, label_from_rating, label_ratings, stratified_split


@pytest.mark.parametrize("rating, label", [
    (5, POSITIVE), (4, POSITIVE), (4.5, POSITIVE),
    (2, NEGATIVE), (1, NEGATIVE), (1.5, NEGATIVE),
    (3, None), (3.5, None), (2.5, None), (None, None),
])
def test_label_from_rating(rating: float | None, label: str | None) -> None:
    assert label_from_rating(rating) == label


def test_label_ratings_drops_three_stars_and_missing_ratings() -> None:
    assert label_ratings([5, 3, None, 1, 4]) == ([0, 3, 4], [POSITIVE, NEGATIVE, POSITIVE])


def test_stratified_split_is_80_20_and_keeps_class_shares() -> None:
    labels = [POSITIVE] * 30 + [NEGATIVE] * 20
    train, test = stratified_split(labels)
    assert len(train) == 40 and len(test) == 10
    assert sorted(train + test) == list(range(50))  # disjoint and complete
    assert Counter(labels[i] for i in test) == {POSITIVE: 6, NEGATIVE: 4}
    assert Counter(labels[i] for i in train) == {POSITIVE: 24, NEGATIVE: 16}


def test_stratified_split_is_repeatable() -> None:
    labels = [POSITIVE, NEGATIVE] * 25
    assert stratified_split(labels) == stratified_split(labels)


@pytest.mark.parametrize("labels", [
    [],  # no labelled reviews at all
    [POSITIVE] * 10,  # one class only
    [POSITIVE] * 10 + [NEGATIVE],  # a class with a single review cannot be in both parts
    [POSITIVE, POSITIVE, NEGATIVE, NEGATIVE],  # 20% of 4 rounds up to 1 test review, fewer than 2 classes
])
def test_stratified_split_rejects_too_little_data(labels: list[str]) -> None:
    with pytest.raises(InsufficientData):
        stratified_split(labels)


def test_evaluate_confusion_matrix_rows_are_true_labels() -> None:
    y_true = [NEGATIVE, NEGATIVE, POSITIVE, POSITIVE]
    y_pred = [NEGATIVE, POSITIVE, POSITIVE, POSITIVE]
    result = evaluate(y_true, y_pred)
    assert result["accuracy"] == 0.75
    assert result["confusion_matrix"] == {"labels": [NEGATIVE, POSITIVE], "matrix": [[1, 1], [0, 2]]}
    # Macro average: negative P=1, R=0.5; positive P=2/3, R=1.
    assert result["precision"] == round((1 + 2 / 3) / 2, 4)
    assert result["recall"] == 0.75
