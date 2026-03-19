"""
Tests for the market data loading and calibration layer.
Run with: pytest tests/test_data.py -v
"""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.data.loader import (
    TimeseriesColSpec,
    load_timeseries_csv,
    load_single_stocks_csv,
)
from app.data.registry import MarketDataRegistry, reset_registry
from app.data.calibration import compute_calibration, compute_all_calibrations
from app.models.market_data import AssetRecord, PricePoint

client = TestClient(app)

# Workspace root — where the CSVs live
DATA_DIR = Path(__file__).parent.parent


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _has_csv_files() -> bool:
    return (DATA_DIR / "Market_Data - Bonds.csv").exists()


skip_if_no_csvs = pytest.mark.skipif(
    not _has_csv_files(),
    reason="Market data CSV files not found at workspace root.",
)


def _make_record(symbol: str, prices: list) -> AssetRecord:
    return AssetRecord(
        symbol=symbol,
        name=symbol,
        category="equities",
        subcategory="equity_indices",
        currency="CHF",
        series=[PricePoint(date=f"2024-01-{i+1:02d}", price=p) for i, p in enumerate(prices)],
    )


# ---------------------------------------------------------------------------
# Unit tests: _parse_price and _parse_date (via loader internals)
# ---------------------------------------------------------------------------

def test_parse_price_handles_na_markers():
    from app.data.loader import _parse_price
    for marker in ("#N/A", "N/A", "", " ", "-"):
        assert _parse_price(marker) is None


def test_parse_price_handles_comma_thousands():
    from app.data.loader import _parse_price
    assert _parse_price("  7,917.1 ") == 7917.1


def test_parse_price_standard():
    from app.data.loader import _parse_price
    assert _parse_price("551.80") == 551.80
    assert _parse_price("  161.62 ") == 161.62


def test_parse_date_valid():
    from app.data.loader import _parse_date
    assert _parse_date("17/2/2006") == "2006-02-17"
    assert _parse_date("01/12/2020") == "2020-12-01"


def test_parse_date_invalid():
    from app.data.loader import _parse_date
    assert _parse_date("") is None
    assert _parse_date("not-a-date") is None
    assert _parse_date("2006-02-17") is None  # wrong format for this parser


# ---------------------------------------------------------------------------
# Unit tests: calibration
# ---------------------------------------------------------------------------

def test_calibration_basic():
    record = _make_record("TEST", [100.0, 101.0, 99.0, 102.0, 100.5])
    stats = compute_calibration(record)
    assert stats is not None
    assert stats.symbol == "TEST"
    assert stats.num_observations == 5
    assert isinstance(stats.avg_daily_return_pct, float)
    assert stats.annualized_vol_pct >= 0
    assert stats.std_daily_return_pct >= 0


def test_calibration_total_return():
    record = _make_record("TR_TEST", [100.0, 110.0])
    stats = compute_calibration(record)
    assert stats is not None
    assert abs(stats.total_return_pct - 10.0) < 0.01


def test_calibration_returns_none_for_single_observation():
    record = _make_record("SINGLE", [100.0])
    assert compute_calibration(record) is None


def test_calibration_returns_none_for_empty_series():
    record = _make_record("EMPTY", [])
    assert compute_calibration(record) is None


def test_calibration_min_max_return():
    record = _make_record("MINMAX", [100.0, 120.0, 90.0])  # +20%, -25%
    stats = compute_calibration(record)
    assert stats is not None
    assert abs(stats.max_daily_return_pct - 20.0) < 0.01
    assert abs(stats.min_daily_return_pct - (-25.0)) < 0.01


def test_compute_all_calibrations_filters_insufficient():
    records = [
        _make_record("GOOD", [100.0, 105.0, 103.0]),
        _make_record("BAD", [100.0]),  # only 1 observation
    ]
    result = compute_all_calibrations(records)
    assert "GOOD" in result
    assert "BAD" not in result


# ---------------------------------------------------------------------------
# Integration tests: CSV loading (require actual files)
# ---------------------------------------------------------------------------

@skip_if_no_csvs
def test_bonds_csv_loads():
    from app.data.registry import _BONDS_SPECS
    records = load_timeseries_csv(DATA_DIR / "Market_Data - Bonds.csv", _BONDS_SPECS)
    assert len(records) == 3
    symbols = [r.symbol for r in records]
    assert "CH-BOND-TR" in symbols
    assert "GLOBAL-AGG-TR-CHF" in symbols
    assert "CH-GOV-10Y-YIELD" in symbols


@skip_if_no_csvs
def test_bonds_series_non_empty():
    from app.data.registry import _BONDS_SPECS
    records = load_timeseries_csv(DATA_DIR / "Market_Data - Bonds.csv", _BONDS_SPECS)
    for r in records:
        assert len(r.series) > 0, f"{r.symbol} should have at least one valid observation"


@skip_if_no_csvs
def test_equity_indices_csv_loads():
    from app.data.registry import _EQUITY_SPECS
    records = load_timeseries_csv(DATA_DIR / "Market_Data - Equity Indices.csv", _EQUITY_SPECS)
    assert len(records) == 5
    symbols = [r.symbol for r in records]
    assert "SMI" in symbols
    assert "DJIA" in symbols


@skip_if_no_csvs
def test_equity_indices_comma_values_parsed():
    from app.data.registry import _EQUITY_SPECS
    records = load_timeseries_csv(DATA_DIR / "Market_Data - Equity Indices.csv", _EQUITY_SPECS)
    smi = next(r for r in records if r.symbol == "SMI")
    assert smi.series[0].price > 1000, "SMI should be above 1000 (thousands separator parsed)"


@skip_if_no_csvs
def test_fx_csv_loads():
    from app.data.registry import _FX_SPECS
    records = load_timeseries_csv(DATA_DIR / "Market_Data - FX.csv", _FX_SPECS)
    assert len(records) == 2
    symbols = [r.symbol for r in records]
    assert "USDCHF" in symbols
    assert "EURCHF" in symbols


@skip_if_no_csvs
def test_fx_values_in_realistic_range():
    from app.data.registry import _FX_SPECS
    records = load_timeseries_csv(DATA_DIR / "Market_Data - FX.csv", _FX_SPECS)
    usdchf = next(r for r in records if r.symbol == "USDCHF")
    for pt in usdchf.series:
        assert 0.5 <= pt.price <= 2.5, f"USDCHF={pt.price} is unrealistic on {pt.date}"


@skip_if_no_csvs
def test_gold_csv_loads():
    from app.data.registry import _GOLD_SPECS
    records = load_timeseries_csv(DATA_DIR / "Market_Data - Gold.csv", _GOLD_SPECS)
    assert len(records) == 2
    symbols = [r.symbol for r in records]
    assert "GOLD-USD" in symbols
    assert "GOLD-CHF" in symbols


@skip_if_no_csvs
def test_djia_stocks_csv_loads():
    records = load_single_stocks_csv(
        DATA_DIR / "Market_Data - DJIA_Single Stocks.csv",
        category="equities",
        subcategory="djia_stocks",
        currency="USD",
    )
    assert len(records) == 30
    symbols = [r.symbol for r in records]
    assert "AAPL-US" in symbols
    assert "MSFT-US" in symbols
    assert "GS-US" in symbols


@skip_if_no_csvs
def test_djia_stocks_have_series():
    records = load_single_stocks_csv(
        DATA_DIR / "Market_Data - DJIA_Single Stocks.csv",
        category="equities",
        subcategory="djia_stocks",
        currency="USD",
    )
    # At least 25 of 30 should have non-empty series (some newer listings may be sparse)
    non_empty = [r for r in records if len(r.series) > 0]
    assert len(non_empty) >= 25


@skip_if_no_csvs
def test_smi_stocks_csv_loads():
    records = load_single_stocks_csv(
        DATA_DIR / "Market_Data - SMI_Single Stocks.csv",
        category="equities",
        subcategory="smi_stocks",
        currency="CHF",
    )
    assert len(records) == 20
    symbols = [r.symbol for r in records]
    assert "NESN-CH" in symbols
    assert "NOVN-CH" in symbols


@skip_if_no_csvs
def test_smi_stocks_correct_currency():
    records = load_single_stocks_csv(
        DATA_DIR / "Market_Data - SMI_Single Stocks.csv",
        category="equities",
        subcategory="smi_stocks",
        currency="CHF",
    )
    for r in records:
        assert r.currency == "CHF"


# ---------------------------------------------------------------------------
# Integration tests: Registry
# ---------------------------------------------------------------------------

@skip_if_no_csvs
def test_registry_loads_all_subcategories():
    reset_registry()
    registry = MarketDataRegistry.load(DATA_DIR)
    subcategories = {r.subcategory for r in registry.get_all_records()}
    expected = {"equity_indices", "bonds", "fx", "gold", "djia_stocks", "smi_stocks"}
    assert expected == subcategories


@skip_if_no_csvs
def test_registry_total_asset_count():
    reset_registry()
    registry = MarketDataRegistry.load(DATA_DIR)
    # 3 bonds + 5 equity indices + 2 fx + 2 gold + 30 DJIA + 20 SMI = 62
    assert len(registry.get_all_records()) == 62


@skip_if_no_csvs
def test_registry_get_by_symbol():
    reset_registry()
    registry = MarketDataRegistry.load(DATA_DIR)
    smi = registry.get_by_symbol("SMI")
    assert smi is not None
    assert smi.category == "equities"
    assert smi.currency == "CHF"


@skip_if_no_csvs
def test_registry_get_by_category():
    reset_registry()
    registry = MarketDataRegistry.load(DATA_DIR)
    equities = registry.get_by_category("equities")
    # 5 indices + 30 DJIA + 20 SMI = 55
    assert len(equities) == 55


@skip_if_no_csvs
def test_registry_summary_structure():
    reset_registry()
    registry = MarketDataRegistry.load(DATA_DIR)
    summary = registry.summary()
    assert summary.total_assets == 62
    assert summary.calibration_available is True
    assert summary.date_range_start is not None
    assert summary.date_range_end is not None
    assert len(summary.notes) > 0


@skip_if_no_csvs
def test_registry_get_by_unknown_symbol_returns_none():
    reset_registry()
    registry = MarketDataRegistry.load(DATA_DIR)
    assert registry.get_by_symbol("DOES-NOT-EXIST") is None


# ---------------------------------------------------------------------------
# Integration tests: API endpoints
# ---------------------------------------------------------------------------

@skip_if_no_csvs
def test_data_summary_endpoint():
    reset_registry()
    resp = client.get("/data/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_assets" in data
    assert data["total_assets"] == 62
    assert data["calibration_available"] is True


@skip_if_no_csvs
def test_data_assets_endpoint():
    reset_registry()
    resp = client.get("/data/assets")
    assert resp.status_code == 200
    data = resp.json()
    assert "equity_indices" in data
    assert "bonds" in data
    assert "fx" in data
    assert "gold" in data
    assert "djia_stocks" in data
    assert "smi_stocks" in data


@skip_if_no_csvs
def test_data_assets_no_series_in_response():
    """Price series should not be present in the /data/assets response."""
    reset_registry()
    resp = client.get("/data/assets")
    data = resp.json()
    for subcategory in data.values():
        for asset in subcategory:
            assert "series" not in asset


@skip_if_no_csvs
def test_data_calibration_endpoint():
    reset_registry()
    resp = client.get("/data/calibration")
    assert resp.status_code == 200
    data = resp.json()
    assert "SMI" in data
    assert "GOLD-USD" in data
    assert "USDCHF" in data


@skip_if_no_csvs
def test_data_calibration_symbol_endpoint_smi():
    reset_registry()
    resp = client.get("/data/calibration/SMI")
    assert resp.status_code == 200
    stats = resp.json()
    assert stats["symbol"] == "SMI"
    assert stats["annualized_vol_pct"] > 0
    assert isinstance(stats["total_return_pct"], float)


@skip_if_no_csvs
def test_data_calibration_unknown_symbol_returns_404():
    reset_registry()
    resp = client.get("/data/calibration/DOESNOTEXIST")
    assert resp.status_code == 404


@skip_if_no_csvs
def test_data_calibration_gold_usd_realistic():
    """Gold annualised vol should be in a historically plausible range (~10–25%)."""
    reset_registry()
    resp = client.get("/data/calibration/GOLD-USD")
    stats = resp.json()
    assert 5.0 <= stats["annualized_vol_pct"] <= 40.0, (
        f"Gold annualized vol {stats['annualized_vol_pct']} is outside realistic range"
    )


@skip_if_no_csvs
def test_data_calibration_crypto_more_volatile_than_bonds():
    """
    Validates that the calibration-based sanity rule holds:
    crypto is more volatile than bonds. Since we have no crypto CSV, we
    instead check that equities are more volatile than bonds.
    """
    reset_registry()
    resp_eq = client.get("/data/calibration/SMI")
    resp_bond = client.get("/data/calibration/CH-BOND-TR")
    assert resp_eq.status_code == 200
    assert resp_bond.status_code == 200
    assert resp_eq.json()["annualized_vol_pct"] > resp_bond.json()["annualized_vol_pct"]
