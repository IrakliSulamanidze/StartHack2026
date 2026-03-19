from typing import List

from pydantic import BaseModel, Field


class AssetState(BaseModel):
    """Live state of one asset class during a scenario."""

    asset_class: str
    # Indexed value — starts at 100.0 at scenario creation.
    current_price: float = 100.0
    # Full price history for chart rendering. Index 0 = scenario start.
    price_history: List[float] = Field(default_factory=lambda: [100.0])
    # Cumulative return since scenario start, in percentage points.
    cumulative_return_pct: float = 0.0
    # Return in the most recently completed turn, in percentage points.
    turn_return_pct: float = 0.0
    # True if this asset is currently under an active shock effect.
    is_in_shock: bool = False


class BenchmarkState(BaseModel):
    """State of the reference benchmark portfolio for comparison."""

    # Human-readable label (e.g. "Balanced (60% equities / 40% bonds)").
    label: str
    # Indexed value — starts at 100.0.
    current_value: float = 100.0
    value_history: List[float] = Field(default_factory=lambda: [100.0])
    cumulative_return_pct: float = 0.0
