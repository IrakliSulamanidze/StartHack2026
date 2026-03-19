"""
Market Calibration Service — Wealth Manager Arena
===================================================
Computes bounded, deterministic statistics from loaded price series.

All calculations use Python stdlib (math, statistics) only — no numpy/pandas.
These stats are intended as calibration references for the scenario engine,
NOT as free-form financial inputs for the LLM.

Key outputs per instrument:
  - avg / std / min / max daily return (%)
  - average absolute daily move (%)
  - annualised volatility estimate (std * sqrt(252))
  - total return from first to last valid observation

How this supports Phase 2 (turn engine):
  - annualized_vol_pct can validate / replace BASE_VOLATILITY in regimes.py
  - avg_daily_return_pct can cross-check drift_range bounds per asset class
  - total_return_pct gives long-run anchors per instrument
"""

import math
import statistics
from typing import Dict, List, Optional

from app.models.market_data import AssetRecord, CalibrationStats

# Approximate trading days per year — used for annualisation
_TRADING_DAYS_PER_YEAR = 252


def compute_calibration(record: AssetRecord) -> Optional[CalibrationStats]:
    """
    Compute CalibrationStats for one AssetRecord.
    Returns None if the series has fewer than 2 valid observations.
    """
    prices = [p.price for p in record.series if p.price > 0]
    if len(prices) < 2:
        return None

    # Daily simple returns in %
    returns: List[float] = [
        (prices[i] - prices[i - 1]) / prices[i - 1] * 100.0
        for i in range(1, len(prices))
    ]

    if not returns:
        return None

    avg = statistics.mean(returns)
    std = statistics.stdev(returns) if len(returns) > 1 else 0.0
    min_r = min(returns)
    max_r = max(returns)
    avg_abs = statistics.mean(abs(r) for r in returns)
    annualized_vol = std * math.sqrt(_TRADING_DAYS_PER_YEAR)

    # Total return: first valid price → last valid price
    total_return = (prices[-1] - prices[0]) / prices[0] * 100.0

    first_date = record.series[0].date if record.series else None
    last_date = record.series[-1].date if record.series else None

    return CalibrationStats(
        symbol=record.symbol,
        name=record.name,
        category=record.category,
        subcategory=record.subcategory,
        num_observations=len(prices),
        avg_daily_return_pct=round(avg, 4),
        std_daily_return_pct=round(std, 4),
        min_daily_return_pct=round(min_r, 4),
        max_daily_return_pct=round(max_r, 4),
        avg_abs_daily_move_pct=round(avg_abs, 4),
        annualized_vol_pct=round(annualized_vol, 4),
        total_return_pct=round(total_return, 2),
        first_date=first_date,
        last_date=last_date,
    )


def compute_all_calibrations(
    records: List[AssetRecord],
) -> Dict[str, CalibrationStats]:
    """
    Compute CalibrationStats for a list of AssetRecords.
    Returns a dict keyed by symbol. Symbols with < 2 observations are excluded.
    """
    result: Dict[str, CalibrationStats] = {}
    for record in records:
        stats = compute_calibration(record)
        if stats is not None:
            result[record.symbol] = stats
    return result


def category_calibration_summary(
    calibrations: Dict[str, CalibrationStats],
    category: str,
) -> Optional[Dict[str, float]]:
    """
    Aggregate calibration across all instruments in a category.
    Returns a dict of summary stats useful for engine cross-checks:
      - median_annualized_vol_pct
      - median_avg_abs_daily_move_pct
      - median_total_return_pct
    Returns None if no instruments found for the given category.
    """
    subset = [c for c in calibrations.values() if c.category == category]
    if not subset:
        return None

    vols = sorted(c.annualized_vol_pct for c in subset)
    abs_moves = sorted(c.avg_abs_daily_move_pct for c in subset)
    total_returns = sorted(c.total_return_pct for c in subset)

    def _median(lst: List[float]) -> float:
        n = len(lst)
        mid = n // 2
        return lst[mid] if n % 2 else (lst[mid - 1] + lst[mid]) / 2.0

    return {
        "median_annualized_vol_pct": round(_median(vols), 4),
        "median_avg_abs_daily_move_pct": round(_median(abs_moves), 4),
        "median_total_return_pct": round(_median(total_returns), 2),
        "num_instruments": len(subset),
    }
