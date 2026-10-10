import pytest

from src.preprocess import ensure_nltk_data


@pytest.fixture(scope="session", autouse=True)
def nltk_data() -> None:
    ensure_nltk_data()
