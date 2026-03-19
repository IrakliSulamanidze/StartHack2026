from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from app.core.constants import EventSeverity, EventType


class EventImpact(BaseModel):
    """
    The effect of one event on one asset class.
    delta_pct is the immediate price change in percentage points (positive = gain).
    """

    asset_class: str
    delta_pct: float
    duration_turns: int
    # How much the residual impact shrinks each subsequent turn (0–1).
    decay_factor: float = 0.5


class GameEvent(BaseModel):
    """A fully instantiated market event for a scenario."""

    event_id: str
    title: str
    type: EventType
    severity: EventSeverity
    # Asset classes that this event touches.
    affected_assets: List[str]
    # Individual impact per asset class.
    impacts: List[EventImpact]
    # Which turn this event fires.
    turn: int
    # Structured description — may be enriched by the LLM summary service.
    description: str


class ScheduledEvent(BaseModel):
    """Lightweight reference used in the turn timetable."""

    turn: int
    event_id: str
    # False until the turn engine reveals it to the player.
    revealed: bool = False
