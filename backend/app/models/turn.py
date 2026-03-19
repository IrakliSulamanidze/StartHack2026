from typing import Dict, List, Optional

from pydantic import BaseModel

from app.models.asset import AssetState, BenchmarkState
from app.models.event import GameEvent
from app.models.portfolio import Allocation


class AllocateInput(BaseModel):
    """Set portfolio allocations without advancing the turn."""

    scenario_id: str
    player_id: str
    allocations: List[Allocation]


class TurnInput(BaseModel):
    """What the player submits at the start of each turn."""

    scenario_id: str
    player_id: str
    # None = hold current allocations unchanged.
    new_allocations: Optional[List[Allocation]] = None


class TurnResult(BaseModel):
    """What the backend returns after processing one turn."""

    scenario_id: str
    player_id: str
    turn_number: int

    # Updated market state
    asset_states: Dict[str, AssetState]
    benchmark_state: BenchmarkState

    # Portfolio performance this turn
    portfolio_value: float
    portfolio_return_this_turn_pct: float
    portfolio_cash: float = 0.0

    # Events that fired this turn (revealed to the player)
    events_this_turn: List[GameEvent]

    is_game_over: bool

    # Only populated for AI level 1 and 2 — never for AI level 3 / ranked.
    next_turn_preview: Optional[str] = None
