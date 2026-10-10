# FoodSense AI

A FastAPI backend that runs NLP analyses on restaurant reviews: text statistics, preprocessing,
keywords, n-grams, a bigram language model, POS tags and word embeddings, named entities, topics,
sentiment, emotions, aspect-based sentiment and an extractive summary.

## Setup

Requires Python 3.11.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

`requirements.txt` pins every direct dependency, including the spaCy English model
`en_core_web_sm` 3.8.0, which is installed from its release wheel URL so every install gets the
same model version. To install only the model (for example into an existing environment), run:

```bash
python -m spacy download en_core_web_sm-3.8.0 --direct
```

`python -m spacy validate` checks that the installed model matches the spaCy version.

NLTK data (tokenizer, stopwords, WordNet, tagger, VADER) downloads automatically on first start.
The two Hugging Face models download on first use of `/api/sentiment` and `/api/emotion` (roughly
250-330 MB each, cached in `~/.cache/huggingface`). Everything runs on CPU. On Linux, the default
`torch` wheel includes CUDA libraries. For a smaller CPU-only install, run
`pip install torch==2.14.1 --index-url https://download.pytorch.org/whl/cpu` before the requirements.

## Data

The app loads `data/reviews.csv` (columns `restaurant`, `review`, `rating`). The bundled file is
synthetic placeholder data from `scripts/make_sample_data.py`. Because it is templated, the
classifiers reach ~100% accuracy on it. Use a real dataset for meaningful results.

To convert a Kaggle CSV, pass its column names:

```bash
python scripts/prepare_dataset.py path/to/kaggle.csv \
    --review-col Review --rating-col Rating --restaurant-col Restaurant
```

The script drops empty reviews and duplicates (same restaurant and text), keeps the leading number
of ratings like `4.1/5`, writes `data/reviews.csv` (or `--output`) and prints a summary. Use
`--encoding latin-1` for files that are not UTF-8. Ratings are expected on a 1-5 scale.

## Run

```bash
uvicorn app.main:app --reload
```

Interactive docs: http://localhost:8000/docs

## Endpoints

All routes are under `/api`. Analyses run on the current dataset: the CSV, an upload, pasted text,
a scraped page, or one restaurant chosen with `/api/data/select`. Results are cached until the
dataset changes.

| Route | What it returns |
| --- | --- |
| `GET /linguistics?term=food&k=10` | NLTK POS tag distribution (Penn and universal tags); Word2Vec nearest words for `term`; held-out accuracy of a logistic regression on averaged Word2Vec vectors |
| `GET /entities` | spaCy entity counts by label, top entities, dishes (noun phrases near food words) |
| `GET /topics` | gensim LDA with 5 topics: top words, share of reviews, c_v coherence |
| `GET /sentiment` | TF-IDF + logistic regression vs `distilbert-base-uncased-finetuned-sst-2-english`: accuracy, macro precision/recall/F1, confusion matrix |
| `GET /emotion` | `j-hartmann/emotion-english-distilroberta-base` emotion counts |
| `GET /aspects` | Food, service, ambience, price and cleanliness: mentions and positive/negative/neutral counts |
| `GET /summary?k=5&sentences=3` | Top dishes, top complaints, short extractive summary |

Notes on behaviour:

- **Labels**: `/sentiment` and the `/linguistics` classifier label ratings >= 4 positive and
  <= 2 negative, and drop 3-star and unrated reviews. They use a stratified 80/20 split (seed 42).
- **Transformer cap**: transformer inference is capped at 300 reviews per request. `/emotion`
  scores a fixed random sample. `/sentiment` scores both models on the same first 300 held-out
  reviews. The response's `inference` field and `notes` list say when the cap applied.
- **English only**: non-English reviews and reviews with no words are skipped and counted in
  `notes`. If none are left, the route returns 422. Texts under 5 words count as English when
  most of their words are English, because langdetect is unreliable on very short text.
- **Errors**: too little data for an analysis (for example, no ratings for `/sentiment`, or fewer
  than 5 reviews for `/topics`) returns 422 with the reason. A model that cannot be loaded returns 503.
- **Aspect scoring**: aspects are found per sentence with a keyword lexicon (`src/aspects.py`)
  and scored with NLTK's VADER, so `/aspects` and `/summary` cover the whole dataset.

## Frontend

A React dashboard in `frontend/` (Vite, TypeScript, Tailwind, shadcn/ui, Recharts). Requires Node 20+.
With the API running on port 8000:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` to `http://localhost:8000` (set
`API_TARGET` to change it). In development, `#/preview` shows the shared components in each state.

## Tests

```bash
pytest
```
