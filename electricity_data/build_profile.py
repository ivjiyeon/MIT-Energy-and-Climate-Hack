import csv
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo


DATA_DIR = Path(__file__).resolve().parent.parent / "src"
OUTPUT_PATH = Path(__file__).resolve().parent / "profile.js"
YEAR = 2025
REGIONS = {
    "denver": {
        "state": "CO",
        "respondent": "PSCO",
        "time_zone": "America/Denver",
    },
    "boston": {
        "state": "MA",
        "respondent": "ISNE",
        "time_zone": "America/New_York",
    },
}


def read_retail_rates(state):
    path = DATA_DIR / f"eia_2025_retail_price_{state}.csv"
    with path.open(newline="", encoding="utf-8") as source:
        rows = list(csv.DictReader(source))
    if len(rows) != 12:
        raise ValueError(f"{path} must contain exactly 12 monthly retail rates")

    rates = {}
    for row in rows:
        period = datetime.strptime(row["period"], "%Y-%m")
        if row["stateid"] != state or row["sectorid"] != "RES":
            raise ValueError(f"{path} must contain only {state} residential (RES) rates")
        month = period.month
        if period.year != YEAR or month in rates:
            raise ValueError(f"{path} has an invalid or duplicate month: {row['period']}")
        rates[month] = round(float(row["cents_per_kwh"]) / 100, 4)
    if set(rates) != set(range(1, 13)):
        raise ValueError(f"{path} does not cover every month of {YEAR}")
    return rates


def read_hourly_demand(region, time_zone):
    path = DATA_DIR / f"eia_2025_hourly_demand_{region}.csv"
    local_zone = ZoneInfo(time_zone)
    buckets = defaultdict(list)
    seen_periods = set()
    with path.open(newline="", encoding="utf-8") as source:
        rows = csv.DictReader(source)
        for row in rows:
            if row["respondent"] != region:
                raise ValueError(f"{path} contains an unexpected respondent: {row['respondent']}")
            period = datetime.fromisoformat(row["period"].replace("Z", "+00:00"))
            if period.tzinfo is None:
                raise ValueError(f"{path} contains a timestamp without a time zone")
            period = period.astimezone(timezone.utc)
            if period.year != YEAR or period in seen_periods:
                raise ValueError(f"{path} contains an invalid or duplicate period: {row['period']}")
            seen_periods.add(period)
            local_period = period.astimezone(local_zone)
            buckets[(local_period.month, local_period.hour)].append(float(row["demand_mwh"]))

    if len(seen_periods) != 8760:
        raise ValueError(f"{path} must contain 8,760 unique hourly observations; found {len(seen_periods)}")
    demand = []
    for month in range(1, 13):
        hours = []
        for hour in range(24):
            values = buckets[(month, hour)]
            if not values:
                raise ValueError(f"{path} has no observations for month {month}, hour {hour}")
            hours.append(round(sum(values) / len(values), 2))
        demand.append(hours)
    return demand


def build_profile():
    profiles = {}
    for location, config in REGIONS.items():
        state = config["state"]
        rates = read_retail_rates(state)
        profiles[location] = {
            "year": YEAR,
            "state": state,
            "sector": "RES",
            "region": config["respondent"],
            "timeZone": config["time_zone"],
            "currency": "USD",
            "rateUnit": "USD/kWh",
            "hourly": [[rates[month] for _ in range(24)] for month in range(1, 13)],
            "demandMWh": read_hourly_demand(config["respondent"], config["time_zone"]),
        }
    return profiles


if __name__ == "__main__":
    profile = build_profile()
    OUTPUT_PATH.write_text(
        "window.PF_EIA_RETAIL_DATA = "
        + json.dumps(profile, separators=(",", ":"), sort_keys=True)
        + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT_PATH} with Denver and Boston profiles.")
