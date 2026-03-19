"""
Scenario Service — Wealth Manager Arena
=========================================
Responsible for creating new game scenarios.

All logic here is DETERMINISTIC given the same seed.
No LLM calls. No free-form financial math.
- Regime is selected from a bounded library.
- Events are pre-scheduled using seeded RNG.
- Asset states are initialised at a fixed index of 100.
"""

import random
import uuid
from typing import Dict, List, Optional, Tuple

from app.core.constants import Difficulty, EventSeverity, TimeMode
from app.core.events import EVENT_TEMPLATES, EventTemplate
from app.core.regimes import DIFFICULTY_REGIMES, REGIME_BENCHMARK_WEIGHTS, REGIME_LIBRARY, RegimeTemplate
from app.data.asset_selector import select_assets_for_scenario
from app.models.asset import AssetState, BenchmarkState
from app.models.event import EventImpact, GameEvent, ScheduledEvent
from app.models.scenario import ScenarioConfig, ScenarioState


# Default turn counts per (difficulty, time_mode) combination.
_DEFAULT_TURNS: Dict[Tuple[str, str], int] = {
    (Difficulty.BEGINNER, TimeMode.MONTHLY):      24,
    (Difficulty.BEGINNER, TimeMode.YEARLY):       10,
    (Difficulty.INTERMEDIATE, TimeMode.MONTHLY):  36,
    (Difficulty.INTERMEDIATE, TimeMode.YEARLY):   15,
    (Difficulty.ADVANCED, TimeMode.MONTHLY):      60,
    (Difficulty.ADVANCED, TimeMode.YEARLY):       20,
}


def create_scenario(config: ScenarioConfig) -> ScenarioState:
    """
    Generate a fully initialised ScenarioState from a ScenarioConfig.

    The only source of randomness is `config.seed` (or a freshly drawn seed if
    None). All downstream decisions are derived from that single seed, making
    scenarios 100% replayable.
    """
    seed = config.seed if config.seed is not None else random.randint(1, 10_000_000)
    rng = random.Random(seed)

    # ── 1. Select regime ────────────────────────────────────────────────────
    regime_key = _select_regime(config, rng)
    regime = REGIME_LIBRARY[regime_key]

    # ── 2. Determine number of turns ────────────────────────────────────────
    num_turns: int = config.num_turns or _DEFAULT_TURNS.get(
        (config.difficulty, config.time_mode), 24
    )

    # ── 3. Select concrete instruments from registry ─────────────────────────
    selected_assets = select_assets_for_scenario(config.asset_classes, rng)

    # ── 4. Initialise asset states (price index starts at 100) ───────────────
    asset_states: Dict[str, AssetState] = {
        ac: AssetState(
            asset_class=ac,
            symbol=selected_assets[ac].symbol,
            name=selected_assets[ac].name,
            current_price=100.0,
            price_history=[100.0],
            cumulative_return_pct=0.0,
            turn_return_pct=0.0,
        )
        for ac in config.asset_classes
    }

    # ── 5. Initialise benchmark ──────────────────────────────────────────────
    benchmark_state = BenchmarkState(
        label=regime.benchmark_label,
        current_value=100.0,
        value_history=[100.0],
        cumulative_return_pct=0.0,
    )

    # ── 6. Compute and normalise benchmark weights for this regime ───────────
    raw_weights = REGIME_BENCHMARK_WEIGHTS.get(regime_key, {})
    # Keep only asset classes that are active in this scenario
    filtered = {ac: w for ac, w in raw_weights.items() if ac in config.asset_classes}
    if filtered:
        total = sum(filtered.values())
        benchmark_weights = {ac: round(w / total, 6) for ac, w in filtered.items()}
    else:
        # Fallback: equal weight over all active classes
        n = len(config.asset_classes)
        benchmark_weights = {ac: round(1.0 / n, 6) for ac in config.asset_classes}

    # ── 7. Pre-generate event schedule ──────────────────────────────────────
    events, event_schedule = _generate_events(
        regime, num_turns, config.asset_classes, rng
    )

    return ScenarioState(
        scenario_id=str(uuid.uuid4()),
        regime_type=regime_key,
        regime_label=regime.label,
        asset_classes=config.asset_classes,
        current_turn=0,
        num_turns=num_turns,
        time_mode=config.time_mode,
        seed=seed,
        asset_states=asset_states,
        benchmark_state=benchmark_state,
        events={e.event_id: e for e in events},
        event_schedule=event_schedule,
        game_mode=config.game_mode,
        ai_level=config.ai_level,
        is_complete=False,
        selected_assets=selected_assets,
        benchmark_weights=benchmark_weights,
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _select_regime(config: ScenarioConfig, rng: random.Random) -> str:
    if config.regime_override:
        if config.regime_override not in REGIME_LIBRARY:
            raise ValueError(
                f"Unknown regime_override '{config.regime_override}'. "
                f"Valid values: {list(REGIME_LIBRARY.keys())}"
            )
        return config.regime_override
    pool = DIFFICULTY_REGIMES.get(config.difficulty, list(REGIME_LIBRARY.keys()))
    return rng.choice(pool)


def _generate_events(
    regime: RegimeTemplate,
    num_turns: int,
    asset_classes: List[str],
    rng: random.Random,
) -> Tuple[List[GameEvent], List[ScheduledEvent]]:
    """
    Pre-schedule all events for the scenario.

    Strategy:
    - Guarantee at least one MAJOR event in the middle third of the game.
    - Place IMPACTFUL events every ~4 turns from turn 2.
    - Fill even-numbered turns with ORDINARY news (mild background noise).
    - All events are filtered to match the active asset_classes and regime type.
    """
    events: List[GameEvent] = []
    schedule: List[ScheduledEvent] = []
    used_turns: set = set()

    def _filter(severity: Optional[str] = None) -> List[EventTemplate]:
        """Return templates matching severity + asset intersection + regime relevance."""
        out = []
        for t in EVENT_TEMPLATES:
            if severity and t.severity != severity:
                continue
            if not any(a in asset_classes for a in t.affected_assets):
                continue
            # ORDINARY events are generic background noise — always eligible.
            if t.severity != EventSeverity.ORDINARY:
                if t.type not in regime.typical_event_types:
                    continue
            out.append(t)
        return out

    major_pool = _filter(EventSeverity.MAJOR)
    impactful_pool = _filter(EventSeverity.IMPACTFUL)
    ordinary_pool = _filter(EventSeverity.ORDINARY)

    # ── Guarantee one major event in turns [num_turns/3 … 2*num_turns/3] ───
    if major_pool and num_turns >= 3:
        low = max(1, num_turns // 3)
        high = min(num_turns - 1, (num_turns * 2) // 3)
        major_turn = rng.randint(low, high)
        template = rng.choice(major_pool)
        event = _instantiate_event(template, major_turn, asset_classes, rng)
        events.append(event)
        schedule.append(ScheduledEvent(turn=major_turn, event_id=event.event_id))
        used_turns.add(major_turn)

    # ── IMPACTFUL events every ~4 turns starting at turn 2 ──────────────────
    for slot in range(2, num_turns, 4):
        slot = _next_free_turn(slot, used_turns, num_turns)
        if slot is None:
            break
        pool = impactful_pool or ordinary_pool
        if not pool:
            continue
        template = rng.choice(pool)
        event = _instantiate_event(template, slot, asset_classes, rng)
        events.append(event)
        schedule.append(ScheduledEvent(turn=slot, event_id=event.event_id))
        used_turns.add(slot)

    # ── ORDINARY news on remaining even turns ───────────────────────────────
    for turn in range(2, num_turns, 2):
        if turn in used_turns:
            continue
        pool = ordinary_pool or impactful_pool
        if not pool:
            continue
        template = rng.choice(pool)
        event = _instantiate_event(template, turn, asset_classes, rng)
        events.append(event)
        schedule.append(ScheduledEvent(turn=turn, event_id=event.event_id))
        used_turns.add(turn)

    schedule.sort(key=lambda s: s.turn)
    return events, schedule


def _next_free_turn(start: int, used: set, max_turns: int) -> Optional[int]:
    for t in range(start, max_turns):
        if t not in used:
            return t
    return None


def _instantiate_event(
    template: EventTemplate,
    turn: int,
    asset_classes: List[str],
    rng: random.Random,
) -> GameEvent:
    """
    Create a concrete GameEvent from a template.
    The delta_pct for each asset is sampled uniformly within the template's
    bounded impact range using the seeded RNG — NOT invented by an LLM.
    """
    impacts: List[EventImpact] = []
    for asset_class, (min_delta, max_delta, duration) in template.impact_ranges.items():
        if asset_class not in asset_classes:
            continue
        delta = round(rng.uniform(min_delta, max_delta), 2)
        impacts.append(
            EventImpact(
                asset_class=asset_class,
                delta_pct=delta,
                duration_turns=duration,
                decay_factor=template.decay_factor,
            )
        )

    return GameEvent(
        event_id=str(uuid.uuid4()),
        title=template.title,
        type=template.type,
        severity=template.severity,
        affected_assets=[a for a in template.affected_assets if a in asset_classes],
        impacts=impacts,
        turn=turn,
        description=template.description,
    )
