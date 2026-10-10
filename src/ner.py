"""Named entities with spaCy (en_core_web_sm) and dish extraction from noun phrases near food words."""

import threading
from collections import Counter
from collections.abc import Iterator
from functools import cache

import spacy
from spacy.tokens import Doc, Span

from src.aspects import is_opinion_word

SPACY_MODEL = "en_core_web_sm"
INSTALL_HINT = "pip install -r requirements.txt (it pins the en_core_web_sm wheel)"

# Lemmas that signal the surrounding noun phrase is about food: tastes, textures, cooking, ordering, eating.
FOOD_WORDS = frozenset({
    "food", "dish", "meal", "taste", "tasty", "tasteless", "flavour", "flavor", "flavourful", "flavorful",
    "delicious", "yummy", "bland", "spicy", "salty", "sweet", "sour", "crispy", "juicy", "tender", "fresh",
    "stale", "soggy", "greasy", "oily", "inedible", "cook", "overcooked", "undercooked", "season", "seasoned",
    "portion", "order", "eat", "try", "enjoy", "love", "recommend", "serve", "menu", "dessert", "starter",
    "appetizer", "cuisine",
})
# Noun-phrase heads that are never a dish: the food words themselves plus the other review aspects.
GENERIC_HEADS = FOOD_WORDS | {
    "place", "restaurant", "staff", "service", "waiter", "waitress", "server", "manager", "owner", "table",
    "time", "minute", "hour", "price", "money", "value", "bill", "ambience", "ambiance", "atmosphere", "decor",
    "interior", "music", "experience", "visit", "lot", "bit", "way", "thing", "kind", "one", "everything",
    "something", "nothing", "day", "night", "weekend", "friend", "family", "people", "quality", "quantity",
    "size", "option", "variety", "item", "plate", "cup", "glass", "drink", "best", "worst",
}
# Leading modifiers that describe the order, not the dish ("the same pizza", "a big salad").
NON_DISH_MODIFIERS = frozenset({
    "same", "other", "whole", "entire", "usual", "only", "first", "last", "next", "little", "big", "small",
    "huge", "large", "new", "own", "overall", "favourite", "favorite", "regular", "typical", "famous",
})
# Adjectives that belong to a dish name ("sweet potato fries") even though they can also express an opinion.
CULINARY_MODIFIERS = frozenset({
    "fried", "grilled", "roasted", "baked", "steamed", "smoked", "stuffed", "boiled", "sauteed", "spicy",
    "sweet", "sour", "hot", "cold", "iced", "masala", "tandoori", "butter", "garlic", "veggie", "vegetarian",
})
WINDOW = 6  # how many tokens either side of a noun phrase to look for a food word


class ModelNotInstalled(RuntimeError):
    pass


_lock = threading.Lock()


def nlp() -> spacy.language.Language:
    with _lock:
        return _load()


@cache
def _load() -> spacy.language.Language:
    try:
        return spacy.load(SPACY_MODEL)
    except OSError as exc:
        raise ModelNotInstalled(f"spaCy model {SPACY_MODEL} is not installed. Run: {INSTALL_HINT}") from exc


def _is_name_part(token) -> bool:
    """Whether a modifier belongs in a dish name: "avocado", "fried" yes; "the", "best", "tasty", "same" no."""
    word = token.lower_
    if word in CULINARY_MODIFIERS or token.pos_ in ("NOUN", "PROPN"):
        return True
    if token.pos_ not in ("ADJ", "VERB"):  # determiners, pronouns, numbers, adverbs
        return False
    return not (is_opinion_word(word) or word in FOOD_WORDS or word in NON_DISH_MODIFIERS)


def dish_name(chunk: Span) -> str | None:
    """Drop leading determiners, pronouns and opinion words: "the best butter chicken" -> "butter chicken"."""
    tokens = list(chunk)
    while tokens and tokens[0] != chunk.root and not _is_name_part(tokens[0]):
        tokens.pop(0)
    name = " ".join(token.lower_ for token in tokens if token.is_alpha)
    return name or None


def dish_mentions(doc: Doc) -> Iterator[str]:
    """Noun phrases headed by a specific noun that sit within WINDOW tokens of a food word in the same sentence."""
    food_positions = [t.i for t in doc if t.lower_ in FOOD_WORDS or t.lemma_.lower() in FOOD_WORDS]
    for chunk in doc.noun_chunks:
        root = chunk.root
        if root.pos_ not in ("NOUN", "PROPN") or root.lemma_.lower() in GENERIC_HEADS or root.lower_ in GENERIC_HEADS:
            continue
        near = any(
            chunk.start - WINDOW <= i < chunk.end + WINDOW and doc[i].sent.start == chunk.sent.start
            for i in food_positions
        )
        if near and (name := dish_name(chunk)):
            yield name


def analyse(texts: list[str], top_k: int = 20) -> dict:
    """Entity counts by label, the most frequent entities, and the most mentioned dishes (counted once per review)."""
    labels, entities, dishes = Counter(), Counter(), Counter()
    for doc in nlp().pipe(texts, batch_size=64):
        for ent in doc.ents:
            labels[ent.label_] += 1
            entities[(" ".join(ent.text.split()), ent.label_)] += 1
        dishes.update(set(dish_mentions(doc)))
    return {
        "model": SPACY_MODEL,
        "labels": [
            {"label": label, "description": spacy.explain(label), "count": count} for label, count in labels.most_common()
        ],
        "entities": [{"text": text, "label": label, "count": count} for (text, label), count in entities.most_common(top_k)],
        "dishes": [{"dish": dish, "review_count": count} for dish, count in dishes.most_common(top_k)],
    }
