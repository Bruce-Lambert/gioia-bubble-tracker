#!/usr/bin/env python3

import json
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Tuple

import requests

AV_URL = "https://www.alphavantage.co/query"


@dataclass(frozen=True)
class AvConfig:
    api_key: str
    outputsize: str = "full"  # we trim locally; "full" ensures we can cover the backtest window


def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")
    print(f"[{ts}] {msg}", flush=True)


def load_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, obj: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def fetch_daily_adjusted(symbol: str, cfg: AvConfig) -> Dict[str, Any]:
    params = {
        "function": "TIME_SERIES_DAILY_ADJUSTED",
        "symbol": symbol,
        "outputsize": cfg.outputsize,
        "apikey": cfg.api_key,
    }
    r = requests.get(AV_URL, params=params, timeout=60)
    r.raise_for_status()
    j = r.json()

    if "Error Message" in j:
        raise RuntimeError(f"Alpha Vantage error for {symbol}: {j['Error Message']}")
    if "Note" in j:
        raise RuntimeError(
            f"Alpha Vantage throttled this request for {symbol}. Message: {j['Note']}"
        )
    if "Time Series (Daily)" not in j:
        raise RuntimeError(f"Unexpected Alpha Vantage response for {symbol}: keys={list(j.keys())}")

    return j


def extract_adjusted_close_series(av_json: Dict[str, Any], earliest_date: str) -> Dict[str, float]:
    series = av_json["Time Series (Daily)"]
    out: Dict[str, float] = {}
    for d, fields in series.items():
        if d < earliest_date:
            continue
        adj = fields.get("5. adjusted close")
        if adj is None:
            continue
        try:
            out[d] = float(adj)
        except ValueError:
            continue
    return out


def merge_series(existing: Dict[str, float], incoming: Dict[str, float]) -> Dict[str, float]:
    merged = dict(existing or {})
    merged.update(incoming or {})
    return merged


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    cfg_path = repo_root / "config" / "predictions.json"
    out_path = repo_root / "data" / "prices.json"

    if not cfg_path.exists():
        raise RuntimeError(f"Missing config file: {cfg_path}")

    av_key = os.environ.get("ALPHAVANTAGE_API_KEY", "").strip()
    if not av_key:
        raise RuntimeError("Missing ALPHAVANTAGE_API_KEY env var (set a GitHub Actions secret).")

    cfg = load_json(cfg_path)
    earliest_date = cfg.get("data_window", {}).get("earliest_date", "2025-07-01")
    tickers = [t["symbol"] for t in cfg.get("tickers", [])]

    if not tickers:
        raise RuntimeError("No tickers found in config/predictions.json")

    current = load_json(out_path) if out_path.exists() else {"series": {}}
    current_series = current.get("series", {})

    av_cfg = AvConfig(api_key=av_key, outputsize="full")

    updated_any = False

    for i, sym in enumerate(tickers, start=1):
        log(f"Fetching {sym} ({i}/{len(tickers)}) from Alpha Vantage…")
        av_json = fetch_daily_adjusted(sym, av_cfg)
        incoming = extract_adjusted_close_series(av_json, earliest_date=earliest_date)

        existing = current_series.get(sym, {})
        merged = merge_series(existing, incoming)

        if merged != existing:
            current_series[sym] = merged
            updated_any = True
            log(f"{sym}: {len(existing)} → {len(merged)} points (earliest kept: {earliest_date}).")
        else:
            log(f"{sym}: no changes ({len(existing)} points).")

        # Respect the 5-requests-per-minute throttle on free keys.
        # We only do 3 calls, but sleeping keeps this resilient if you add tickers later.
        time.sleep(13)

    current["series"] = current_series
    current["generated_utc"] = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")
    current["provider"] = cfg.get("data_source", {}).get("provider", "Alpha Vantage")
    current["endpoint"] = cfg.get("data_source", {}).get("endpoint", "TIME_SERIES_DAILY_ADJUSTED")
    current["field"] = cfg.get("data_source", {}).get("field", "5. adjusted close")
    current["earliest_date"] = earliest_date

    if updated_any:
        dump_json(out_path, current)
        log(f"Wrote updated data to {out_path}.")
    else:
        # Still write if the file is missing or metadata changed; otherwise keep repo clean.
        if not out_path.exists():
            dump_json(out_path, current)
            log(f"Wrote initial data to {out_path}.")
        else:
            log("No data changes; leaving data/prices.json untouched.")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as e:
        log(f"ERROR: {e}")
        raise
