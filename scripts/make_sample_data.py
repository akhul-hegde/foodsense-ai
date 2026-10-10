"""Generate data/reviews.csv with SYNTHETIC placeholder restaurant reviews.

Everything this script writes is made up: the restaurants are fictional and
each review is assembled from templates. Ratings are chosen first and the
text is built from phrases that match that rating, so text and rating agree.
This file only exists so the app has something to run on. Replace
data/reviews.csv with a real dataset (columns: restaurant, review, rating).

Usage: python scripts/make_sample_data.py
"""

import csv
import random
from pathlib import Path

ROW_COUNT = 300
SEED = 42
OUTPUT = Path(__file__).resolve().parent.parent / "data" / "reviews.csv"

# Fictional restaurants and the dishes their reviews mention.
RESTAURANTS: dict[str, list[str]] = {
    "Spice Route": ["butter chicken", "garlic naan", "paneer tikka", "lamb biryani"],
    "Luigi's Trattoria": ["margherita pizza", "lasagna", "carbonara", "tiramisu"],
    "Tokyo Bites": ["salmon sushi", "ramen", "chicken katsu", "miso soup"],
    "The Green Bowl": ["quinoa salad", "avocado toast", "smoothie bowl", "veggie wrap"],
    "Coastal Grill": ["grilled prawns", "fish tacos", "lobster roll", "clam chowder"],
    "Masala Dosa Corner": ["masala dosa", "idli sambar", "filter coffee", "vada"],
}

# Phrases grouped by rating (1 = very negative, 5 = very positive).
FOOD = {
    5: ["The {dish} was outstanding and perfectly seasoned.",
        "Absolutely loved the {dish}, easily the best I have had.",
        "The {dish} was fresh, flavourful and beautifully presented."],
    4: ["The {dish} was really good and tasted fresh.",
        "Enjoyed the {dish}, it was tasty and well cooked.",
        "The {dish} was delicious, though slightly too salty."],
    3: ["The {dish} was okay, nothing special.",
        "The {dish} was decent but a little bland.",
        "The {dish} was average, neither good nor bad."],
    2: ["The {dish} was bland and lukewarm.",
        "The {dish} was disappointing and overcooked.",
        "The {dish} lacked flavour and the portion was small."],
    1: ["The {dish} was cold and tasted stale.",
        "The {dish} was inedible, we sent it back.",
        "Worst {dish} I have ever had, completely tasteless."],
}
SERVICE = {
    5: ["The staff were warm, friendly and attentive.", "Service was quick and excellent."],
    4: ["Service was friendly, though a bit slow at peak hours.", "The staff were polite and helpful."],
    3: ["Service was average.", "The waiter was fine but seemed distracted."],
    2: ["We waited forty minutes for our order.", "The staff were slow and unhelpful."],
    1: ["The staff were rude and ignored us.", "Terrible service, nobody took our order for an hour."],
}
AMBIANCE = {
    5: ["The place is cosy and beautifully decorated.", "Lovely ambiance, perfect for a date night."],
    4: ["The interior is clean and pleasant.", "Nice atmosphere, a little noisy on weekends."],
    3: ["The decor is plain but clean enough.", "The seating was a bit cramped."],
    2: ["The place was noisy and the tables were sticky.", "The dining area felt dull and crowded."],
    1: ["The restaurant was dirty and smelled bad.", "Filthy tables and a broken air conditioner."],
}
PRICE = {
    5: ["Great value for money.", "Generous portions at a fair price."],
    4: ["Prices are reasonable for the quality.", "Fair prices overall."],
    3: ["A bit pricey for the portion size.", "Prices are okay, not cheap."],
    2: ["Overpriced for what you get.", "Too expensive for such small portions."],
    1: ["A complete waste of money.", "Ridiculously overpriced."],
}
CLOSER = {
    5: ["Will definitely come back!", "Highly recommended."],
    4: ["Would visit again.", "Worth a try."],
    3: ["Might come back if nearby.", "It was fine for a quick meal."],
    2: ["Probably not coming back.", "Expected much better."],
    1: ["Never coming back.", "Avoid this place."],
}

# Rough real-world skew: more positive reviews than negative ones.
RATING_WEIGHTS = {1: 0.10, 2: 0.15, 3: 0.20, 4: 0.30, 5: 0.25}


def make_review(rng: random.Random, dishes: list[str], rating: int) -> str:
    """Build one review: a food sentence, one or two aspect sentences, a closer."""
    sentences = [rng.choice(FOOD[rating]).format(dish=rng.choice(dishes))]
    for aspect in rng.sample([SERVICE, AMBIANCE, PRICE], k=rng.randint(1, 2)):
        sentences.append(rng.choice(aspect[rating]))
    sentences.append(rng.choice(CLOSER[rating]))
    return " ".join(sentences)


def main() -> None:
    rng = random.Random(SEED)
    names = list(RESTAURANTS)
    ratings = list(RATING_WEIGHTS)
    weights = list(RATING_WEIGHTS.values())

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["restaurant", "review", "rating"])
        for _ in range(ROW_COUNT):
            restaurant = rng.choice(names)
            rating = rng.choices(ratings, weights)[0]
            writer.writerow([restaurant, make_review(rng, RESTAURANTS[restaurant], rating), rating])
    print(f"Wrote {ROW_COUNT} synthetic reviews to {OUTPUT}")


if __name__ == "__main__":
    main()
