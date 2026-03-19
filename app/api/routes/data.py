"""
Data routes — Wealth Manager Arena
=====================================
Provides inspection endpoints for the loaded market datasets.

GET /data/summary       — overview of all loaded datasets
GET /data/assets        — full asset catalog (metadata, no price series)
GET /data/calibration   — computed calibration stats for all assets
GET /data/calibration/{symbol} — calibration stats for one asset
"""

from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException

from app.data.calibration import compute_all_calibrations
from app.data.registry import get_registry
from app.models.market_data import AssetInfo, CalibrationStats, DataSummary

router = APIRouter()


@router.get("/summary", response_model=DataSummary, summary="Market data summary")
def data_summary() -> DataSummary:
    """
    Returns a high-level overview of all loaded market data:
    - which subcategories are loaded
    - asset counts per subcategory
    - date range coverage
    - notes on data limitations
    """
    return get_registry().summary()


@router.get(
    "/assets",
    response_model=Dict[str, List[AssetInfo]],
    summary="Full asset catalog grouped by subcategory",
)
def asset_catalog() -> Dict[str, List[AssetInfo]]:
    """
    Returns all known assets grouped by subcategory
    (equity_indices, djia_stocks, smi_stocks, bonds, fx, gold).

    Does NOT include price series — use /data/calibration for numeric context.
    """
    registry = get_registry()
    all_records = registry.get_all_records()

    catalog: Dict[str, List[AssetInfo]] = {}
    for record in all_records:
        info = registry.asset_info(record)
        catalog.setdefault(record.subcategory, []).append(info)

    return catalog


@router.get(
    "/calibration",
    response_model=Dict[str, CalibrationStats],
    summary="Calibration statistics for all assets",
)
def all_calibration() -> Dict[str, CalibrationStats]:
    """
    Returns deterministically-computed calibration statistics for every asset
    with at least 2 valid price observations.

    These stats are derived from the CSV datasets and can be used to:
    - validate the bounded ranges in the regime library
    - inform realistic move sizes for the turn engine
    - cross-check benchmark assumptions

    The LLM must not use or modify these values.
    """
    records = get_registry().get_all_records()
    return compute_all_calibrations(records)


@router.get(
    "/calibration/{symbol}",
    response_model=CalibrationStats,
    summary="Calibration statistics for one asset",
)
def symbol_calibration(symbol: str) -> CalibrationStats:
    """
    Returns calibration statistics for a single asset by symbol.

    Example symbols: SMI, DJIA, USDCHF, GOLD-USD, AAPL-US, NESN-CH
    """
    record = get_registry().get_by_symbol(symbol)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail=f"Asset '{symbol}' not found. "
                   "Call GET /data/assets to see available symbols.",
        )
    from app.data.calibration import compute_calibration
    stats = compute_calibration(record)
    if stats is None:
        raise HTTPException(
            status_code=422,
            detail=f"Asset '{symbol}' has fewer than 2 valid observations — "
                   "calibration statistics cannot be computed.",
        )
    return stats
