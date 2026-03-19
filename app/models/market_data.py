from typing import Dict, List, Optional

from pydantic import BaseModel


class PricePoint(BaseModel):
    """One observation in a price/value time series."""
    date: str   # ISO format: YYYY-MM-DD
    price: float


class AssetRecord(BaseModel):
    """
    A single financial instrument loaded from a CSV dataset.
    price_series is stored chronologically, NaN/invalid rows excluded.
    """
    symbol: str
    name: str
    # Maps to AssetClass enum values: "equities", "bonds", "fx", "gold", "crypto"
    category: str
    # More granular: "equity_indices", "djia_stocks", "smi_stocks", "bonds", "fx", "gold"
    subcategory: str
    currency: str
    series: List[PricePoint]


class AssetInfo(BaseModel):
    """
    Lightweight asset descriptor — returned by API endpoints.
    Does NOT include the full price series (keeps response sizes sane).
    """
    symbol: str
    name: str
    category: str
    subcategory: str
    currency: str
    num_observations: int
    first_date: Optional[str]
    last_date: Optional[str]


class CalibrationStats(BaseModel):
    """
    Simple historically-grounded statistics for one instrument.

    Computed deterministically from the CSV price series.
    Intended as a bounded reference for the regime/simulation engine.
    The LLM must not use or override these values.
    """
    symbol: str
    name: str
    category: str
    subcategory: str
    num_observations: int
    # Daily return statistics (in percentage points)
    avg_daily_return_pct: float
    std_daily_return_pct: float
    min_daily_return_pct: float
    max_daily_return_pct: float
    avg_abs_daily_move_pct: float
    # Annualised volatility estimate (std * sqrt(252))
    annualized_vol_pct: float
    # Total return from first to last valid observation
    total_return_pct: float
    first_date: Optional[str]
    last_date: Optional[str]


class DataSummary(BaseModel):
    """High-level overview of what has been loaded from the CSV datasets."""
    categories: List[str]
    # Number of assets per subcategory
    asset_counts: Dict[str, int]
    total_assets: int
    date_range_start: Optional[str]
    date_range_end: Optional[str]
    calibration_available: bool
    notes: List[str]
