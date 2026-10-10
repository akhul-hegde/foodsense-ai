import math

from src.basic_stats import detect_language, overview, split_sentences, tokenize, word_tokens
from src.preprocess import clean_tokens, is_english, lemmatize_tokens, preprocess_review, stem_tokens
from src.tfidf import top_terms


def test_tokenize_keeps_punctuation_and_splits_contractions() -> None:
    assert tokenize("The food wasn't great.") == ["The", "food", "was", "n't", "great", "."]


def test_word_tokens_drop_punctuation() -> None:
    assert word_tokens("Good food, bad service!") == ["Good", "food", "bad", "service"]


def test_split_sentences() -> None:
    assert split_sentences("Loved it. Will return! Was it pricey?") == ["Loved it.", "Will return!", "Was it pricey?"]


def test_detect_language() -> None:
    assert detect_language("The food was delicious and the staff were friendly.") == "en"
    assert detect_language("12345 !!!") == "unknown"


def test_overview_counts() -> None:
    result = overview(["Great food. Friendly staff.", "Slow service."])
    assert result["review_count"] == 2
    assert result["word_count"] == 6
    assert result["sentence_count"] == 3
    assert result["tokenization_sample"]["tokens"] == ["Great", "food", ".", "Friendly", "staff", "."]


def test_clean_tokens_removes_stopwords_urls_and_keeps_negations() -> None:
    assert clean_tokens("The soup WASN'T hot, see https://example.com 10/10") == ["soup", "not", "hot", "see"]


def test_stemming() -> None:
    assert stem_tokens(["amazing", "dishes", "waited"]) == ["amaz", "dish", "wait"]


def test_lemmatization_uses_pos() -> None:
    assert lemmatize_tokens(["dishes", "were", "better"]) == ["dish", "be", "good"]


def test_lemmatization_keeps_pronouns() -> None:
    assert lemmatize_tokens(["staff", "ignored", "us"]) == ["staff", "ignore", "us"]


def test_is_english() -> None:
    assert is_english("The food was delicious and the staff were friendly.")
    assert is_english("Good food")  # langdetect alone calls this Somali
    assert not is_english("La comida estaba deliciosa y el servicio fue excelente.")
    assert not is_english("Muy bueno")
    assert not is_english("10/10 !!!")


def test_preprocess_review_lines_up_columns() -> None:
    result = preprocess_review("Waiters were rushing.")
    assert result["cleaned"] == "waiters rushing"
    assert result["stemmed"] == "waiter rush"
    assert result["lemmatized"] == "waiter rush"
    assert result["tokens"][0] == {"token": "waiters", "stem": "waiter", "lemma": "waiter"}


def test_tfidf_mean_scores_match_hand_calculation() -> None:
    # Smoothed idf = ln((1 + n) / (1 + df)) + 1; each doc vector is L2-normalised; score = mean over docs.
    idf_shared, idf_unique = 1.0, math.log(3 / 2) + 1
    norm = math.hypot(idf_shared, idf_unique)
    result = {t["term"]: t for t in top_terms([["pizza", "good"], ["pizza", "bad"]])}
    assert result["pizza"]["score"] == round(idf_shared / norm, 4)
    assert result["good"]["score"] == round(idf_unique / norm / 2, 4)
    assert result["pizza"]["doc_count"] == 2
    assert top_terms([[]]) == []
