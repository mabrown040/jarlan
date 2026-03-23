# Data Refresh Scripts

Use this directory for repeatable ingestion and normalization scripts that convert public datasets into app-ready JSON.

Current scripts:

- `fetch_shiller.mjs` refreshes the normalized monthly Shiller dataset and updates `data/manifest.json`

Planned next scripts:

- `fetch_mortality.py`
- `fetch_tax_brackets.py`

Raw source downloads should live in `.cache/` rather than `data/`, and the final normalized output should be written into `data/`.
