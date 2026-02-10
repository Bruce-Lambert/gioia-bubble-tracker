# Ted Gioia AI Bubble Call Tracker (static site)

This repo hosts a small, neutral tracker that visualizes how **NVDA**, **META**, and **QQQ** performed after two public posts by Ted Gioia discussing an “AI bubble” peaking.

The site is hosted via **GitHub Pages** and the data file (`data/prices.json`) is refreshed by a daily **GitHub Actions** workflow using **Alpha Vantage** daily *adjusted close* data.

> Educational/informational only. Not investment advice.

## What it shows

For a selected ticker:

- **Adjusted close** (latest available trading day)
- Value of **100 shares**
- Value of **$1000 invested** on:
  - 2025-08-08
  - 2025-10-30

The chart displays the two “$1000 invested” series and marks both dates.

## Setup (10–15 minutes)

### 1) Create a free Alpha Vantage API key

Get a key from Alpha Vantage.

### 2) Add the API key to GitHub Secrets

In your repo:

- Settings → Secrets and variables → Actions → **New repository secret**
- Name: `ALPHAVANTAGE_API_KEY`
- Value: your key

### 3) Run the workflow once to generate initial data

- Actions tab → `update-prices` → Run workflow

This will populate `data/prices.json`.

### 4) Enable GitHub Pages

- Settings → Pages
- Source: “Deploy from a branch”
- Branch: `main`
- Folder: `/ (root)`

After Pages is enabled, your site URL will appear there.

## Local preview

From the repo root:

```bash
python -m http.server 8000
```

Open http://localhost:8000

## Notes

- The workflow is scheduled daily. Data will only change on trading days.
- The script includes a small sleep to respect Alpha Vantage free-tier throttling.
