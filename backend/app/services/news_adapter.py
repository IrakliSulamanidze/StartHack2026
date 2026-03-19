"""
News Adapter — maps deterministic backend state to the news_agent composer.

Design rules:
- This module is OUTPUT-ONLY / narrative-only.
- It NEVER influences prices, event timing, event selection, portfolio math,
  or scenario progression.
- All deterministic turn logic completes BEFORE this module is called.
- If the news_agent composer fails for ANY reason, the caller still succeeds
  with news=None.  Failures are logged, never raised.
- Gemini is optional: controlled by GEMINI_API_KEY env var.  When absent,
  template_only mode is used automatically.
"""

from __future__ import annotations

import logging
import os
from typing import Dict, List, Optional

from app.core.constants import EventSeverity, EventType
from app.models.event import GameEvent
from app.models.news import NewsArticle, NewsHistoricalExample
from app.models.scenario import ScenarioState
from app.models.turn import TurnResult

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# EventType → news_agent category mapping
# ---------------------------------------------------------------------------
# Backend categories that don't map cleanly get a best-fit assignment.
# This table is the single source of truth for the conversion.

_EVENT_TYPE_TO_CATEGORY: Dict[str, Dict[str, str]] = {
    # ── MAJOR severity events ──────────────────────────────────────────────
    EventSeverity.MAJOR: {
        EventType.BANKING_STRESS:              "banking_panic",
        EventType.RECESSION_WARNING:           "recession_onset",
        EventType.GEOPOLITICAL_ESCALATION:     "war_escalation",
        EventType.COMMODITY_SUPPLY_DISRUPTION: "major_commodity_shock",
        EventType.CENTRAL_BANK_DECISION:       "emergency_policy_intervention",
        EventType.INFLATION_SURPRISE:          "global_crash",
        EventType.EARNINGS_SHOCK:              "global_crash",
        EventType.REGULATORY_ACTION:           "emergency_policy_intervention",
        EventType.CRYPTO_SELLOFF:              "global_crash",
        EventType.RECOVERY_SIGNAL:             "global_crash",
    },
    # ── IMPACTFUL severity events ──────────────────────────────────────────
    EventSeverity.IMPACTFUL: {
        EventType.CENTRAL_BANK_DECISION:       "policy_guidance_shift",
        EventType.INFLATION_SURPRISE:          "inflation_surprise",
        EventType.EARNINGS_SHOCK:              "bond_yield_jump",
        EventType.RECESSION_WARNING:           "safe_haven_rotation",
        EventType.BANKING_STRESS:              "safe_haven_rotation",
        EventType.GEOPOLITICAL_ESCALATION:     "oil_price_spike",
        EventType.COMMODITY_SUPPLY_DISRUPTION: "oil_price_spike",
        EventType.REGULATORY_ACTION:           "policy_guidance_shift",
        EventType.CRYPTO_SELLOFF:              "safe_haven_rotation",
        EventType.RECOVERY_SIGNAL:             "dovish_rate_cut",
    },
    # ── ORDINARY severity events ───────────────────────────────────────────
    EventSeverity.ORDINARY: {
        EventType.CENTRAL_BANK_DECISION:       "daily_macro_watch",
        EventType.INFLATION_SURPRISE:          "daily_macro_watch",
        EventType.EARNINGS_SHOCK:              "earnings_tone",
        EventType.RECESSION_WARNING:           "daily_macro_watch",
        EventType.BANKING_STRESS:              "market_chatter",
        EventType.GEOPOLITICAL_ESCALATION:     "market_chatter",
        EventType.COMMODITY_SUPPLY_DISRUPTION: "daily_macro_watch",
        EventType.REGULATORY_ACTION:           "daily_macro_watch",
        EventType.CRYPTO_SELLOFF:              "market_chatter",
        EventType.RECOVERY_SIGNAL:             "market_chatter",
    },
}

# Fallback categories per news_type when lookup misses.
_FALLBACK_CATEGORY: Dict[str, str] = {
    "major": "global_crash",
    "impactful": "policy_guidance_shift",
    "ordinary": "market_chatter",
}


def _map_category(event: GameEvent) -> str:
    """Map a backend GameEvent to the news_agent category string."""
    severity_map = _EVENT_TYPE_TO_CATEGORY.get(event.severity, {})
    category = severity_map.get(event.type)
    if category:
        return category
    return _FALLBACK_CATEGORY.get(event.severity, "market_chatter")


def _compute_severity_score(event: GameEvent) -> int:
    """Derive a 1-5 severity score from the event's impact magnitudes."""
    if not event.impacts:
        return 2
    max_abs = max(abs(imp.delta_pct) for imp in event.impacts)
    if max_abs >= 8.0:
        return 5
    if max_abs >= 5.0:
        return 4
    if max_abs >= 2.5:
        return 3
    if max_abs >= 1.0:
        return 2
    return 1


def _compute_directional_impact(event: GameEvent) -> Dict[str, str]:
    """Derive directional_impact labels from event impacts."""
    result: Dict[str, str] = {}
    for imp in event.impacts:
        if imp.delta_pct >= 3.0:
            result[imp.asset_class] = "strongly_positive"
        elif imp.delta_pct >= 0.5:
            result[imp.asset_class] = "positive"
        elif imp.delta_pct <= -3.0:
            result[imp.asset_class] = "strongly_negative"
        elif imp.delta_pct <= -0.5:
            result[imp.asset_class] = "negative"
        else:
            result[imp.asset_class] = "neutral"
    return result


def _compute_benchmark_move(turn_result: TurnResult) -> float:
    """Get benchmark move from the turn result."""
    bench = turn_result.benchmark_state
    if len(bench.value_history) >= 2:
        prev = bench.value_history[-2]
        if prev > 0:
            return round((bench.current_value / prev - 1.0) * 100.0, 2)
    return 0.0


def _get_news_mode() -> str:
    """Determine provider mode from environment.

    Returns 'gemini' if GEMINI_API_KEY is set and non-empty,
    otherwise 'template_only'.
    """
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    return "gemini" if key else "template_only"


def generate_news_for_turn(
    scenario: ScenarioState,
    turn_result: TurnResult,
) -> Optional[NewsArticle]:
    """Generate a news artifact for the most significant event this turn.

    Returns a typed NewsArticle on success, or None if:
    - no events fired this turn
    - the news_agent module is unavailable
    - the composer fails for any reason

    This function NEVER raises.  All failures are logged and swallowed.
    """
    if not turn_result.events_this_turn:
        return None

    try:
        # Import news_agent lazily so the backend works even if
        # news_agent is not installed or has import errors.
        from news_agent.composer.compose import compose_article
        from news_agent.composer.models import SimulationContext
    except ImportError as exc:
        logger.warning("news_agent not available: %s", exc)
        return None

    # Pick the most significant event this turn (highest impact magnitude).
    primary_event = max(
        turn_result.events_this_turn,
        key=lambda e: max((abs(i.delta_pct) for i in e.impacts), default=0),
    )

    # Build asset_returns from current turn data.
    asset_returns: Dict[str, float] = {}
    for ac, state in turn_result.asset_states.items():
        asset_returns[ac] = state.turn_return_pct

    news_type = primary_event.severity  # already "major"/"impactful"/"ordinary"
    category = _map_category(primary_event)
    severity = _compute_severity_score(primary_event)
    directional_impact = _compute_directional_impact(primary_event)
    benchmark_move = _compute_benchmark_move(turn_result)

    ctx = SimulationContext(
        regime_name=scenario.regime_type,
        turn_number=turn_result.turn_number,
        news_type=news_type,
        category=category,
        region="global",  # backend has no region granularity yet
        severity=severity,
        asset_returns=asset_returns,
        catalyst=primary_event.title,
        historical_ref=None,
        scenario_id=scenario.scenario_id,
        turn_id=f"{scenario.scenario_id}_t{turn_result.turn_number}",
        directional_impact=directional_impact,
        benchmark_move=benchmark_move,
        educational_tags=[primary_event.type, news_type, scenario.regime_type],
    )

    mode = _get_news_mode()

    try:
        article = compose_article(ctx, mode=mode)
        d = article.to_dict()
        hist = d.get("historical_example")
        return NewsArticle(
            headline=d["headline"],
            short_bulletin=d["short_bulletin"],
            beginner_explanation=d["beginner_explanation"],
            historical_example=NewsHistoricalExample(**hist) if hist else None,
            selected_event_ids=d["selected_event_ids"],
            generation_mode=d["generation_mode"],
            validation_flags=d["validation_flags"],
        )
    except Exception as exc:
        logger.warning(
            "News composer failed for scenario=%s turn=%d: %s",
            scenario.scenario_id,
            turn_result.turn_number,
            exc,
        )
        return None
