"""
Download 2025 historical electricity data from the EIA API (v2) to CSV.

Outputs:
  eia_2025_hourly_demand_<BA>.csv   hourly grid demand (MWh), full year
  eia_2025_retail_price_<ST>.csv    monthly average retail price (cents/kWh)

Setup:
  pip install requests pandas
  export EIA_API_KEY=your_key_here      # free at https://www.eia.gov/opendata/

Usage:
  python eia_2025.py --ba ISNE --state MA --sector RES
"""

import argparse
import os
from pathlib import Path

import pandas as pd
import requests

BASE = "https://api.eia.gov/v2"
PAGE = 5000  # EIA's max rows per request
OUTPUT_DIR = Path(__file__).resolve().parent / "src"


def fetch_all(route: str, params: dict) -> pd.DataFrame:
    """Page through an EIA route until all rows are retrieved."""
    key = os.environ.get("EIA_API_KEY")
    if not key:
        raise SystemExit("Set the EIA_API_KEY environment variable first.")

    rows, offset = [], 0
    while True:
        resp = requests.get(
            f"{BASE}/{route}/data/",
            params={"api_key": key, "length": PAGE, "offset": offset, **params},
            timeout=60,
        )
        resp.raise_for_status()
        batch = resp.json()["response"]["data"]
        rows.extend(batch)
        if len(batch) < PAGE:
            break
        offset += PAGE
    return pd.DataFrame(rows)


def hourly_demand_2025(ba: str) -> pd.DataFrame:
    df = fetch_all(
        "electricity/rto/region-data",
        {
            "frequency": "hourly",
            "data[0]": "value",
            "facets[respondent][]": ba,
            "facets[type][]": "D",
            "start": "2025-01-01T00",
            "end": "2025-12-31T23",
            "sort[0][column]": "period",
            "sort[0][direction]": "asc",
        },
    )
    if df.empty:
        return df
    df["period"] = pd.to_datetime(df["period"], utc=True)
    df["value"] = pd.to_numeric(df["value"])
    return df[["period", "respondent", "value"]].rename(columns={"value": "demand_mwh"})


def retail_price_2025(state: str, sector: str) -> pd.DataFrame:
    df = fetch_all(
        "electricity/retail-sales",
        {
            "frequency": "monthly",
            "data[0]": "price",
            "facets[stateid][]": state,
            "facets[sectorid][]": sector,
            "start": "2025-01",
            "end": "2025-12",
            "sort[0][column]": "period",
            "sort[0][direction]": "asc",
        },
    )
    if df.empty:
        return df
    df["price"] = pd.to_numeric(df["price"])
    return df[["period", "stateid", "sectorid", "price"]].rename(
        columns={"price": "cents_per_kwh"}
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--ba", default="PSCO", help="balancing authority, e.g. ISNE, PJM, ERCO")
    p.add_argument("--state", default="CO")
    p.add_argument("--sector", default="RES", help="RES, COM, IND or ALL")
    a = p.parse_args()

    try:
        demand = hourly_demand_2025(a.ba)
        price = retail_price_2025(a.state, a.sector)
    except requests.RequestException as e:
        raise SystemExit(f"API request failed: {e}")

    demand.to_csv(OUTPUT_DIR / f"eia_2025_hourly_demand_{a.ba}.csv", index=False)
    price.to_csv(OUTPUT_DIR / f"eia_2025_retail_price_{a.state}.csv", index=False)
    print(f"Hourly demand rows: {len(demand)} (a full year is about 8,760)")
    print(f"Monthly price rows: {len(price)} (expect 12; recent months may not be published yet)")