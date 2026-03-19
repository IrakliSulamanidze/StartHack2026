from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from app.core.constants import Difficulty, GameMode, TimeMode
from app.models.asset import AssetState, BenchmarkState, SelectedAsset
from app.models.event import ActiveEffect, GameEvent, ScheduledEvent
from app.models.news import NewsArticle
from app.models.portfolio import Portfolio


class ScenarioConfig(BaseModel):
    """
    Player-supplied configuration used to generate a scenario.
    The scenario engine uses this — plus a seed — for fully deterministic output.
    """

    game_mode: GameMode
    time_mode: TimeMode
    # 1 = Coach (most help), 2 = Analyst, 3 = Real Market (no hints).
    ai_level: int
    difficulty: Difficulty
    # Subset of AssetClass enum values the player chose to include.
    asset_classes: List[str]
    # Optional: fix the number of turns. Auto-set from difficulty+time_mode if None.
    num_turns: Optional[int] = None
    # Optional: fix the seed for replay / fairness. Random if None.
    seed: Optional[int] = None
    # Optional: force a specific regime (useful for testing and event mode).
    regime_override: Optional[str] = None


class ScenarioState(BaseModel):
    """
    Full state of a running scenario.
    Returned by /scenario/create and updated by /scenario/advance.
    Contains everything the frontend needs to render the game.
    """

    scenario_id: str
    regime_type: str
    regime_label: str
    asset_classes: List[str]

    # Turn counter — 0 = before the first turn has been played.
    current_turn: int
    num_turns: int
    time_mode: TimeMode
    seed: int

    # Live asset prices, indexed per asset class.
    asset_states: Dict[str, AssetState]
    benchmark_state: BenchmarkState

    # All pre-generated events for this scenario, keyed by event_id.
    events: Dict[str, GameEvent]
    # Ordered timetable of which event fires on which turn.
    event_schedule: List[ScheduledEvent]

    game_mode: GameMode
    ai_level: int
    is_complete: bool = False

    # ── Concrete asset selection (populated at scenario creation) ────────────
    # Maps asset_class → selected real instrument (e.g. "equities" → SMI).
    selected_assets: Dict[str, SelectedAsset] = Field(default_factory=dict)

    # ── Per-player portfolio state ───────────────────────────────────────────
    # Keyed by player_id. Portfolios are created on first advance call.
    portfolios: Dict[str, Portfolio] = Field(default_factory=dict)

    # ── Multi-turn event effects ─────────────────────────────────────────────
    # Residual lingering impacts from events still in effect.
    active_effects: List[ActiveEffect] = Field(default_factory=list)

    # ── Benchmark composition ────────────────────────────────────────────────
    # Fixed weights used to track the reference portfolio each turn.
    # Keys are asset_class names that overlap with the scenario's asset_classes.
    benchmark_weights: Dict[str, float] = Field(default_factory=dict)

    # ── News history ─────────────────────────────────────────────────────────
    # Narrative-only news articles keyed by turn number.
    news_history: Dict[int, NewsArticle] = Field(default_factory=dict)
