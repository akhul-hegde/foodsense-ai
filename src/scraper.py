"""Fetch a web page and pull out review text with requests + BeautifulSoup."""

import json

import requests
from bs4 import BeautifulSoup, Tag

TIMEOUT_SECONDS = 10
HEADERS = {"User-Agent": "Mozilla/5.0 (FoodSenseAI student project)"}
BLOCKED_STATUSES = {401, 403, 429, 503}
BLOCK_MARKERS = ("captcha", "are you a robot", "access denied", "unusual traffic")
MIN_REVIEW_CHARS = 40
CSV_HINT = "Review sites often block automated access; export or copy the reviews and use CSV upload instead."


class ScrapeError(Exception):
    """Scraping failed; the message is safe to show to the user."""

    def __init__(self, reason: str):
        super().__init__(f"{reason} {CSV_HINT}")


def fetch_html(url: str) -> str:
    """Download a page, turning network problems and blocks into ScrapeError."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=TIMEOUT_SECONDS)
    except requests.Timeout:
        raise ScrapeError(f"The site did not respond within {TIMEOUT_SECONDS} seconds.")
    except requests.RequestException as exc:
        raise ScrapeError(f"Could not reach the site ({type(exc).__name__}).")
    if response.status_code in BLOCKED_STATUSES:
        raise ScrapeError(f"The site blocked the request (HTTP {response.status_code}).")
    if not response.ok:
        raise ScrapeError(f"The site returned HTTP {response.status_code}.")
    return response.text


def _jsonld_reviews(soup: BeautifulSoup) -> list[str]:
    """Collect "reviewBody" fields from schema.org JSON-LD blocks."""
    found: list[str] = []

    def walk(node: object) -> None:
        if isinstance(node, dict):
            if isinstance(node.get("reviewBody"), str):
                found.append(node["reviewBody"])
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    for script in soup.find_all("script", type="application/ld+json"):
        try:
            walk(json.loads(script.string or ""))
        except json.JSONDecodeError:
            continue
    return found


def _is_review_element(tag: Tag) -> bool:
    """True if the tag's class, id or itemprop mentions "review"."""
    attrs = [*tag.get("class", []), tag.get("id", ""), tag.get("itemprop", "")]
    return "review" in " ".join(attrs).lower()


def extract_reviews(html: str) -> list[str]:
    """Review texts from JSON-LD data and from innermost elements marked as reviews."""
    soup = BeautifulSoup(html, "html.parser")
    texts = _jsonld_reviews(soup)
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    for tag in soup.find_all(_is_review_element):
        if not tag.find(_is_review_element):  # innermost only, so containers don't duplicate text
            texts.append(tag.get_text(" ", strip=True))

    reviews = list(dict.fromkeys(t.strip() for t in texts if len(t.strip()) >= MIN_REVIEW_CHARS))
    if reviews:
        return reviews
    page_text = soup.get_text(" ").lower()
    if any(marker in page_text for marker in BLOCK_MARKERS):
        raise ScrapeError("The site showed a bot check instead of the page.")
    raise ScrapeError("No reviews were found on this page.")


def scrape_reviews(url: str) -> list[str]:
    """Download a page and return the reviews found on it."""
    return extract_reviews(fetch_html(url))
