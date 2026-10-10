"""Convert a Kaggle review CSV into data/reviews.csv (columns: restaurant, review, rating).

Rows with an empty review are dropped, and so are duplicates (same restaurant and same review
text, ignoring case and spacing). Ratings such as "4.1/5" or "4 stars" keep their leading number;
a rating with no number ("NEW", "-") is left blank. Sentiment labels assume a 1-5 scale.

Usage:
    python scripts/prepare_dataset.py INPUT.csv --review-col Review --rating-col Rating \\
        --restaurant-col Restaurant [--output data/reviews.csv] [--encoding utf-8-sig]

Without --restaurant-col every row gets the restaurant name "Unknown" (or --restaurant-name).
"""

import argparse
import csv
import re
import sys
from collections import Counter
from pathlib import Path

DEFAULT_OUTPUT = Path(__file__).resolve().parent.parent / "data" / "reviews.csv"
NUMBER = re.compile(r"^\s*(\d+(?:\.\d+)?)")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Map a Kaggle review CSV to data/reviews.csv.")
    parser.add_argument("input", type=Path, help="Kaggle CSV file")
    parser.add_argument("--review-col", required=True, help="column holding the review text")
    parser.add_argument("--rating-col", help="column holding the star rating (optional)")
    parser.add_argument("--restaurant-col", help="column holding the restaurant name (optional)")
    parser.add_argument("--restaurant-name", default="Unknown", help="name to use when there is no restaurant column")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help=f"output CSV (default: {DEFAULT_OUTPUT})")
    parser.add_argument("--encoding", default="utf-8-sig", help="input encoding, e.g. latin-1 (default: utf-8-sig)")
    return parser.parse_args(argv)


def parse_rating(value: str) -> str:
    """Leading number of a rating cell as text ("4.1/5" -> "4.1"), or "" when there is none."""
    match = NUMBER.match(value or "")
    return match.group(1) if match else ""


def normalise(text: str) -> str:
    return " ".join(text.split())


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    csv.field_size_limit(2**31 - 1)  # some Kaggle dumps have reviews longer than the 128 KB default

    with args.input.open(newline="", encoding=args.encoding) as f:
        reader = csv.DictReader(f)
        columns = reader.fieldnames or []
        wanted = [c for c in (args.review_col, args.rating_col, args.restaurant_col) if c]
        missing = [c for c in wanted if c not in columns]
        if missing:
            print(f"Column(s) not found: {', '.join(missing)}. Available: {', '.join(columns)}", file=sys.stderr)
            return 1
        rows = list(reader)

    seen: set[tuple[str, str]] = set()
    output = []
    empty = duplicates = unparsed = 0
    for row in rows:
        review = normalise(row.get(args.review_col) or "")
        if not review:
            empty += 1
            continue
        restaurant = normalise(row.get(args.restaurant_col) or "") if args.restaurant_col else ""
        restaurant = restaurant or args.restaurant_name
        key = (restaurant.lower(), review.lower())
        if key in seen:
            duplicates += 1
            continue
        seen.add(key)
        raw_rating = (row.get(args.rating_col) or "").strip() if args.rating_col else ""
        rating = parse_rating(raw_rating)
        if raw_rating and not rating:
            unparsed += 1
        output.append({"restaurant": restaurant, "review": review, "rating": rating})

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["restaurant", "review", "rating"])
        writer.writeheader()
        writer.writerows(output)

    print_summary(args, len(rows), empty, duplicates, unparsed, output)
    return 0


def print_summary(args: argparse.Namespace, read: int, empty: int, duplicates: int, unparsed: int, output: list[dict]) -> None:
    ratings = [float(r["rating"]) for r in output if r["rating"]]
    restaurants = Counter(r["restaurant"] for r in output)
    print(f"Read {read} rows from {args.input}")
    print(f"  dropped {empty} with an empty review, {duplicates} duplicates")
    print(f"Wrote {len(output)} reviews to {args.output}")
    print(f"  restaurants: {len(restaurants)}")
    for name, count in restaurants.most_common(5):
        print(f"    {count:>6}  {name}")
    print(f"  ratings: {len(ratings)} present, {len(output) - len(ratings)} blank ({unparsed} not a number)")
    if ratings:
        stars = Counter(int(r) for r in ratings)  # whole-star buckets: 4.1 counts as 4
        print("  rating distribution (whole stars): " + ", ".join(f"{s}: {stars[s]}" for s in sorted(stars)))
        if max(ratings) > 5:
            print("  warning: ratings above 5 found; the sentiment labels expect a 1-5 scale.")
        positive = sum(r >= 4 for r in ratings)
        negative = sum(r <= 2 for r in ratings)
        print(f"  sentiment labels: {positive} positive (>= 4), {negative} negative (<= 2), "
              f"{len(ratings) - positive - negative} dropped (between 2 and 4)")
    if output:
        lengths = sorted(len(r["review"].split()) for r in output)
        print(f"  review length (words): median {lengths[len(lengths) // 2]}, max {lengths[-1]}")


if __name__ == "__main__":
    sys.exit(main())
