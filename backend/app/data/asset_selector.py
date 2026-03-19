"""
Asset Selector — Wealth Manager Arena
=======================================
Maps abstract asset classes to concrete, liquid benchmark instruments
from the market data registry.

Priority rule (from README BUILD.md):
  "Prefer major liquid benchmark-like assets first, not random single stocks,
   unless single-stock mode is explicitly enabled."

Selection is seeded and deterministic — same seed always picks the same
instrument for each asset class.

Crypto has no CSV data. It uses explicit synthetic calibration constants
documented here. Never call the LLM to derive these values.
"""

import random
from typing import Dict, List, Optional

from app.models.asset import SelectedAsset

# ---------------------------------------------------------------------------
# Priority lists per asset category
# These are ordered by liquidity / benchmark representativeness.
# The selector picks from the top of the list by default.
# ---------------------------------------------------------------------------

# Symbols that exist in the registry under subcategory "equity_indices"
_EQUITY_INDEX_SYMBOLS: List[str] = ["SMI", "DJIA", "EUROSTOXX50", "DAX", "NIKKEI225"]

# Symbols under subcategory "bonds" — exclude the yield series (CH-GOV-10Y-YIELD)
# since it is not a price index and cannot be used as a portfolio asset.
_BOND_SYMBOLS: List[str] = ["CH-BOND-TR", "GLOBAL-AGG-TR-CHF"]

# Symbols under subcategory "fx"
_FX_SYMBOLS: List[str] = ["USDCHF", "EURCHF"]

# Symbols under subcategory "gold"
_GOLD_SYMBOLS: List[str] = ["GOLD-CHF", "GOLD-USD"]

# ---------------------------------------------------------------------------
# Crypto: synthetic calibration constants
# Source: published BTC/ETH historical statistics (2016–2025, multiple sources).
# The LLM must not replace or recalculate these values.
# ---------------------------------------------------------------------------
_CRYPTO_SYNTHETIC = SelectedAsset(
    asset_class="crypto",
    symbol="CRYPTO-SYNTH",
    name="Crypto (Synthetic BTC/ETH blend)",
    currency="USD",
    annualized_vol_pct=80.0,        # ~BTC historical annualised vol
    avg_abs_daily_move_pct=3.2,      # ~BTC/ETH blended average absolute daily move
    is_synthetic=True,
    note=(
        "No CSV data available for crypto. "
        "Calibrated from published BTC/ETH historical statistics (2016–2025). "
        "LLM must not modify these constants."
    ),
)

# ---------------------------------------------------------------------------
# Fallback assets: used when the registry is unavailable (e.g. missing CSVs).
# Calibration values are conservative defaults. The engine will still run.
# ---------------------------------------------------------------------------
_FALLBACK_ASSETS: Dict[str, SelectedAsset] = {
    "equities": SelectedAsset(
        asset_class="equities",
        symbol="EQ-SYNTH",
        name="Equities (Synthetic)",
        currency="CHF",
        annualized_vol_pct=15.0,
        avg_abs_daily_move_pct=0.95,
        is_synthetic=True,
        note="Registry unavailable — using conservative default calibration.",
    ),
    "bonds": SelectedAsset(
        asset_class="bonds",
        symbol="BOND-SYNTH",
        name="Bonds (Synthetic)",
        currency="CHF",
        annualized_vol_pct=5.0,
        avg_abs_daily_move_pct=0.30,
        is_synthetic=True,
        note="Registry unavailable — using conservative default calibration.",
    ),
    "fx": SelectedAsset(
        asset_class="fx",
        symbol="FX-SYNTH",
        name="FX (Synthetic)",
        currency="CHF",
        annualized_vol_pct=7.0,
        avg_abs_daily_move_pct=0.45,
        is_synthetic=True,
        note="Registry unavailable — using conservative default calibration.",
    ),
    "gold": SelectedAsset(
        asset_class="gold",
        symbol="GOLD-SYNTH",
        name="Gold (Synthetic)",
        currency="CHF",
        annualized_vol_pct=14.0,
        avg_abs_daily_move_pct=0.80,
        is_synthetic=True,
        note="Registry unavailable — using conservative default calibration.",
    ),
    "crypto": _CRYPTO_SYNTHETIC,
}

# Map asset_class → preferred symbol list from registry
_PREFERRED_SYMBOLS: Dict[str, List[str]] = {
    "equities": _EQUITY_INDEX_SYMBOLS,
    "bonds":    _BOND_SYMBOLS,
    "fx":       _FX_SYMBOLS,
    "gold":     _GOLD_SYMBOLS,
}


def select_assets_for_scenario(
    asset_classes: List[str],
    rng: random.Random,
) -> Dict[str, SelectedAsset]:
    """
    Deterministically select one concrete instrument per asset class.

    Uses the seeded `rng` so the same seed always produces the same selection.
    Falls back gracefully if an asset class has no registry data or if the
    registry itself cannot be loaded.

    Returns: Dict[asset_class → SelectedAsset]
    """
    registry = _try_load_registry()

    selections: Dict[str, SelectedAsset] = {}
    for asset_class in asset_classes:
        selections[asset_class] = _select_one(asset_class, registry, rng)
    return selections


def _select_one(
    asset_class: str,
    registry,  # MarketDataRegistry | None
    rng: random.Random,
) -> SelectedAsset:
    """Select one instrument for a given asset class."""

    # Crypto is always synthetic — no registry entry.
    if asset_class == "crypto":
        return _CRYPTO_SYNTHETIC

    preferred = _PREFERRED_SYMBOLS.get(asset_class, [])

    if registry is None or not preferred:
        return _FALLBACK_ASSETS.get(asset_class, _make_generic_fallback(asset_class))

    # Try each symbol in the priority list; use the first one found in the registry.
    available: List[str] = [s for s in preferred if registry.get_by_symbol(s) is not None]

    if not available:
        return _FALLBACK_ASSETS.get(asset_class, _make_generic_fallback(asset_class))

    # From the available priority list, pick one using the RNG.
    # For MVP: pick from first half of the list (most liquid), unless the list is short.
    pool_size = max(1, min(3, len(available)))
    pool = available[:pool_size]
    chosen_symbol = rng.choice(pool)

    return _registry_to_selected_asset(asset_class, chosen_symbol, registry)


def _registry_to_selected_asset(
    asset_class: str,
    symbol: str,
    registry,
) -> SelectedAsset:
    """Build a SelectedAsset from registry data + calibration stats."""
    from app.data.calibration import compute_calibration

    record = registry.get_by_symbol(symbol)
    if record is None:
        return _FALLBACK_ASSETS.get(asset_class, _make_generic_fallback(asset_class))

    cal = compute_calibration(record)
    annualized_vol = cal.annualized_vol_pct if cal else 15.0
    avg_abs = cal.avg_abs_daily_move_pct if cal else 1.0

    return SelectedAsset(
        asset_class=asset_class,
        symbol=record.symbol,
        name=record.name,
        currency=record.currency,
        annualized_vol_pct=round(annualized_vol, 2),
        avg_abs_daily_move_pct=round(avg_abs, 4),
        is_synthetic=False,
        note="",
    )


def _try_load_registry():
    """Attempt to load the registry. Returns None on any failure."""
    try:
        from app.data.registry import get_registry
        return get_registry()
    except Exception:
        return None


def _make_generic_fallback(asset_class: str) -> SelectedAsset:
    """Last-resort fallback for unknown asset classes."""
    return SelectedAsset(
        asset_class=asset_class,
        symbol=f"{asset_class.upper()}-SYNTH",
        name=f"{asset_class.title()} (Synthetic)",
        currency="CHF",
        annualized_vol_pct=15.0,
        avg_abs_daily_move_pct=1.0,
        is_synthetic=True,
        note=f"No data available for asset class '{asset_class}'.",
    )
