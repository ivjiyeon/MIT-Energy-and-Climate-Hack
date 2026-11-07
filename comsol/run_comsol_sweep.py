"""
PhaseFarm <-> COMSOL bridge: run a COMSOL model for each strategy and month, then
write a loads CSV that PhaseFarm can import (COMSOL section, step 3).

STATUS: template. It was written against the MPh API (https://mph.readthedocs.io) but has
not been run against a real .mph file, because we had no COMSOL licence while building it.
Expect to adapt the CONFIG block to your model.

Requirements
  - COMSOL Multiphysics 6.x with a licence (Heat Transfer Module recommended)
  - Python 3.9+, `pip install mph`

Usage
  1. In PhaseFarm, select your scenario and click "parameters.txt" (and "weather.csv").
  2. Build your wall/room model in COMSOL using those parameter names (see docs/COMSOL_GUIDE.md).
  3. Edit CONFIG below, then run:
         python run_comsol_sweep.py --model pcm_room.mph --params phasefarm_parameters_boston_Jan.txt
  4. Import the generated comsol_loads.csv in PhaseFarm and tick "Use COMSOL loads".
"""
import argparse
import csv
import math
import re

# ----------------------------------------------------------------------------- CONFIG
CONFIG = {
    "study": "Study 1",                      # time-dependent study, 0-72 h (last 24 h are used)
    # Global evaluation expressions that return the HVAC heating / cooling POWER (W) at each time step.
    # Typical choice: a Global ODE or a boundary heat source that holds the room at T_lo/T_hi,
    # integrated over the inner wall area, e.g. "intop_in(max(-ht.ntflux,0))". Adapt to your model.
    "heat_expr": "Q_heat",
    "cool_expr": "Q_cool",
    "time_unit": "h",
    # How each PhaseFarm strategy maps onto COMSOL parameters.
    "strategies": {
        "base":   {"has_pcm": 0, "d_ins": "d_ins_base"},
        "trad":   {"has_pcm": 0, "d_ins": "d_ins_up"},
        "pcm":    {"has_pcm": 1, "d_ins": "d_ins_base"},
        "hybrid": {"has_pcm": 1, "d_ins": "d_ins_up"},
    },
    # COMSOL models one wall section per m2. Scale W/m2 results to the whole building:
    # set to the value of A_env from parameters.txt, or 1 if your model is already whole-room.
    "area_scale_param": "A_env",
}

# PhaseFarm climate normals for the month loop (edit or extend; must match the PhaseFarm location you exported).
MONTHLY_MEAN_C = [-1.5, -0.5, 3.5, 9, 14.5, 20, 23, 22.5, 18.5, 12, 7, 1.5]   # Boston
MONTHLY_GHI = [1.9, 2.8, 3.9, 4.9, 5.8, 6.3, 6.3, 5.6, 4.5, 3.2, 2.0, 1.6]
# ---------------------------------------------------------------------------------------


def read_params(path):
    """Parse a PhaseFarm parameters.txt (name<TAB>expression<TAB>"description")."""
    out = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            if not line.strip() or line.startswith("#"):
                continue
            parts = line.rstrip("\n").split("\t")
            if len(parts) >= 2:
                out[parts[0]] = parts[1]
    return out


def numeric(expr):
    m = re.match(r"\s*([-+0-9.eE]+)", expr)
    return float(m.group(1)) if m else float("nan")


def daily_kwh(times_h, power_w):
    """Integrate the last 24 h of a power trace (W) to kWh using the trapezoid rule."""
    t_end = times_h[-1]
    e = 0.0
    for i in range(1, len(times_h)):
        if times_h[i] <= t_end - 24:
            continue
        e += 0.5 * (power_w[i] + power_w[i - 1]) * (times_h[i] - times_h[i - 1])
    return e / 1000.0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--model", required=True, help="COMSOL .mph file")
    ap.add_argument("--params", required=True, help="parameters.txt exported from PhaseFarm")
    ap.add_argument("--out", default="comsol_loads.csv")
    ap.add_argument("--months", default="1-12", help="e.g. 1-12 or 1,7")
    args = ap.parse_args()

    import mph  # imported here so --help works without COMSOL

    params = read_params(args.params)
    scale = numeric(params.get(CONFIG["area_scale_param"], "1")) if CONFIG["area_scale_param"] else 1.0
    if "-" in args.months:
        a, b = map(int, args.months.split("-"))
        months = list(range(a, b + 1))
    else:
        months = [int(x) for x in args.months.split(",")]

    client = mph.start()
    model = client.load(args.model)
    for name, expr in params.items():
        try:
            model.parameter(name, expr)
        except Exception as exc:  # parameter not used by this model
            print(f"skip parameter {name}: {exc}")

    rows = []
    for sid, cfg in CONFIG["strategies"].items():
        model.parameter("has_pcm", str(cfg["has_pcm"]))
        model.parameter("d_ins", cfg["d_ins"])
        for m in months:
            model.parameter("T_out_mean", f"{MONTHLY_MEAN_C[m - 1]}[degC]")
            model.parameter("G_day", f"{MONTHLY_GHI[m - 1]}[kW*h/m^2]")
            print(f"solving {sid} month {m} ...", flush=True)
            model.solve(CONFIG["study"])
            t = list(model.evaluate("t", CONFIG["time_unit"]))
            qh = [max(0.0, float(x)) for x in model.evaluate(CONFIG["heat_expr"], "W")]
            qc = [max(0.0, float(x)) for x in model.evaluate(CONFIG["cool_expr"], "W")]
            heat, cool = daily_kwh(t, qh) * scale, daily_kwh(t, qc) * scale
            if math.isnan(heat) or math.isnan(cool):
                print("  warning: NaN result")
            rows.append([sid, m, round(heat, 3), round(cool, 3)])
            print(f"  heat {heat:.1f} kWh/day, cool {cool:.1f} kWh/day")

    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["strategy", "month", "heat_kWh_per_day", "cool_kWh_per_day"])
        w.writerows(rows)
    print(f"wrote {args.out}. Import it in PhaseFarm → COMSOL → step 3.")


if __name__ == "__main__":
    main()
