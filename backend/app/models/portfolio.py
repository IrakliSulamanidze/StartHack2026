from typing import List, Optional

from pydantic import BaseModel, Field, model_validator


class Allocation(BaseModel):
    """Desired portfolio weight for one asset class. Weights must sum to 1.0."""

    asset_class: str
    # Weight as a fraction: 0.0 to 1.0.
    weight: float


class Trade(BaseModel):
    """A reallocation action taken by the player during a turn."""

    # None means the source is cash (initial deposit or cash reserve).
    from_asset: Optional[str] = None
    to_asset: str
    # Proportion of total portfolio value being moved.
    amount_pct: float


class Portfolio(BaseModel):
    """Full portfolio state for one player in one scenario."""

    player_id: str
    scenario_id: str
    initial_capital: float = 10_000.0
    allocations: List[Allocation] = Field(default_factory=list)
    trade_history: List[Trade] = Field(default_factory=list)
    value_history: List[float] = Field(default_factory=list)
    current_value: float = 10_000.0
