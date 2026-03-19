"""
Market Data Registry — Wealth Manager Arena
=============================================
Orchestrates loading of all 6 CSV datasets and exposes a unified query interface.

Usage anywhere in the backend:
    from app.data.registry import get_registry
    registry = get_registry()
    eq_indices = registry.get_by_subcategory("equity_indices")
    summary = registry.summary()

The registry is loaded once on first access (lazy singleton).
The CSV file paths are resolved relative to the workspace root (two levels above
this file's directory: app/data/ → app/ → workspace root).

NOTE on filenames: The CSV files have spaces in their names. This works fine with
pathlib.Path. For production, rename to snake_case (e.g. market_data_bonds.csv).
"""

from pathlib import Path
from typing import Dict, List, Optional

from app.data.loader import (
    TimeseriesColSpec,
    load_single_stocks_csv,
    load_timeseries_csv,
)
from app.models.market_data import AssetInfo, AssetRecord, DataSummary

# ---------------------------------------------------------------------------
# Paths — resolved relative to workspace root (parent of app/)
# ---------------------------------------------------------------------------
_DATA_DIR = Path(__file__).parent.parent.parent  # workspace root

_CSV_FILES: Dict[str, Path] = {
    "bonds":         _DATA_DIR / "Market_Data - Bonds.csv",
    "equity_indices": _DATA_DIR / "Market_Data - Equity Indices.csv",
    "fx":            _DATA_DIR / "Market_Data - FX.csv",
    "gold":          _DATA_DIR / "Market_Data - Gold.csv",
    "djia_stocks":   _DATA_DIR / "Market_Data - DJIA_Single Stocks.csv",
    "smi_stocks":    _DATA_DIR / "Market_Data - SMI_Single Stocks.csv",
}

# ---------------------------------------------------------------------------
# Column specifications — define exactly which columns map to which assets
# ---------------------------------------------------------------------------

_BONDS_SPECS = [
    TimeseriesColSpec(1, "CH-BOND-TR",        "Swiss Bond AAA-BBB (Total Return Index)",                 "bonds", "bonds", "CHF"),
    TimeseriesColSpec(2, "GLOBAL-AGG-TR-CHF", "Bloomberg Global Aggregate Bond Index (CHF hedged TR)",   "bonds", "bonds", "CHF"),
    # NOTE: col 3 is a yield (%), not a price index — treat as-is for calibration
    TimeseriesColSpec(3, "CH-GOV-10Y-YIELD",  "Switzerland Government Bond 10Y Yield (%)",               "bonds", "bonds", "CHF"),
]

_EQUITY_SPECS = [
    TimeseriesColSpec(1, "SMI",        "SMI (Price Return)",                          "equities", "equity_indices", "CHF"),
    TimeseriesColSpec(2, "EUROSTOXX50","EuroStoxx 50 (Price Return)",                 "equities", "equity_indices", "EUR"),
    TimeseriesColSpec(3, "DJIA",       "Dow Jones Industrial Average (Price Return)", "equities", "equity_indices", "USD"),
    TimeseriesColSpec(4, "NIKKEI225",  "Nikkei 225 (Price Return)",                   "equities", "equity_indices", "JPY"),
    TimeseriesColSpec(5, "DAX",        "DAX (Total Return)",                           "equities", "equity_indices", "EUR"),
]

_FX_SPECS = [
    TimeseriesColSpec(1, "USDCHF", "USD/CHF Exchange Rate", "fx", "fx", "CHF"),
    TimeseriesColSpec(2, "EURCHF", "EUR/CHF Exchange Rate", "fx", "fx", "CHF"),
]

# Gold CSV: first column header is "Gold (NY)" (the date column); data starts col 1
_GOLD_SPECS = [
    TimeseriesColSpec(1, "GOLD-USD", "Gold (NY) in USD", "gold", "gold", "USD"),
    TimeseriesColSpec(2, "GOLD-CHF", "Gold (NY) in CHF", "gold", "gold", "CHF"),
]


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

class MarketDataRegistry:
    """
    Holds all loaded AssetRecord objects and provides query methods.
    Built once from static CSV files — does not change at runtime.
    """

    def __init__(self, records: List[AssetRecord]) -> None:
        self._records = records
        # Index by symbol for O(1) lookup
        self._by_symbol: Dict[str, AssetRecord] = {r.symbol: r for r in records}

    # ── Queries ─────────────────────────────────────────────────────────────

    def get_all_records(self) -> List[AssetRecord]:
        return list(self._records)

    def get_by_category(self, category: str) -> List[AssetRecord]:
        return [r for r in self._records if r.category == category]

    def get_by_subcategory(self, subcategory: str) -> List[AssetRecord]:
        return [r for r in self._records if r.subcategory == subcategory]

    def get_by_symbol(self, symbol: str) -> Optional[AssetRecord]:
        return self._by_symbol.get(symbol)

    def list_symbols(self, subcategory: Optional[str] = None) -> List[str]:
        if subcategory:
            return [r.symbol for r in self._records if r.subcategory == subcategory]
        return [r.symbol for r in self._records]

    def asset_info(self, record: AssetRecord) -> AssetInfo:
        """Convert a full AssetRecord to lightweight AssetInfo (no series data)."""
        first = record.series[0].date if record.series else None
        last = record.series[-1].date if record.series else None
        return AssetInfo(
            symbol=record.symbol,
            name=record.name,
            category=record.category,
            subcategory=record.subcategory,
            currency=record.currency,
            num_observations=len(record.series),
            first_date=first,
            last_date=last,
        )

    def summary(self) -> DataSummary:
        subcategories = sorted({r.subcategory for r in self._records})
        asset_counts = {sc: sum(1 for r in self._records if r.subcategory == sc)
                        for sc in subcategories}

        # Gather all dates across all series
        all_dates: List[str] = []
        for r in self._records:
            if r.series:
                all_dates.append(r.series[0].date)
                all_dates.append(r.series[-1].date)

        notes = [
            "CH-GOV-10Y-YIELD is a yield series, not a price index — use for context only.",
            "DJIA and SMI single stocks have historical gaps (#N/A) for newer listings.",
            "File paths contain spaces; rename to snake_case for production.",
        ]

        return DataSummary(
            categories=sorted({r.category for r in self._records}),
            asset_counts=asset_counts,
            total_assets=len(self._records),
            date_range_start=min(all_dates) if all_dates else None,
            date_range_end=max(all_dates) if all_dates else None,
            calibration_available=True,
            notes=notes,
        )

    # ── Factory ─────────────────────────────────────────────────────────────

    @classmethod
    def load(cls, data_dir: Optional[Path] = None) -> "MarketDataRegistry":
        """
        Load all 6 CSV files and return a ready MarketDataRegistry.
        Raises FileNotFoundError if a CSV is missing.
        Raises ValueError if a CSV is malformed.
        """
        d = data_dir or _DATA_DIR
        files = {k: (d / p.name) for k, p in _CSV_FILES.items()}

        records: List[AssetRecord] = []

        records += load_timeseries_csv(files["bonds"],          _BONDS_SPECS)
        records += load_timeseries_csv(files["equity_indices"], _EQUITY_SPECS)
        records += load_timeseries_csv(files["fx"],             _FX_SPECS)
        records += load_timeseries_csv(files["gold"],           _GOLD_SPECS)

        records += load_single_stocks_csv(
            files["djia_stocks"],
            category="equities",
            subcategory="djia_stocks",
            currency="USD",
        )
        records += load_single_stocks_csv(
            files["smi_stocks"],
            category="equities",
            subcategory="smi_stocks",
            currency="CHF",
        )

        return cls(records)


# ---------------------------------------------------------------------------
# Module-level lazy singleton
# ---------------------------------------------------------------------------

_registry: Optional[MarketDataRegistry] = None


def get_registry() -> MarketDataRegistry:
    """Return the shared registry, loading CSVs on first call."""
    global _registry
    if _registry is None:
        _registry = MarketDataRegistry.load()
    return _registry


def reset_registry() -> None:
    """Reset the singleton — used in tests to inject a custom data dir."""
    global _registry
    _registry = None
