from typing import List, Optional

from pydantic import BaseModel

from app.models.scoring import ScoringResult


class SummaryRequest(BaseModel):
    """Input to the LLM summary service. Contains structured data only — no free-form text."""

    scenario_id: str
    player_id: str
    scoring: ScoringResult
    regime_type: str
    regime_label: str
    # Titles of events the player encountered during the game.
    events_encountered: List[str]
    ai_level: int


class SummaryResponse(BaseModel):
    """LLM-generated coaching output. Only wording comes from the LLM."""

    scenario_id: str
    player_id: str
    narrative_summary: str
    # 3–5 personalised learning takeaways
    what_you_learned: List[str]
    behavior_profile: str
    improvement_mission: str


class CoachHintRequest(BaseModel):
    """Input to the LLM coach service. Structured context only."""

    scenario_id: str
    player_id: str
    turn_number: int
    # Current portfolio weights by asset class
    current_allocations: dict
    # Titles of events that just fired this turn
    recent_events: List[str]
    portfolio_return_pct: float
    ai_level: int


class CoachHintResponse(BaseModel):
    hint: str
    educational_note: Optional[str] = None
