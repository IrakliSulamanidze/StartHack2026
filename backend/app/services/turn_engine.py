"""
Turn Engine — Wealth Manager Arena
=====================================
Pure-function deterministic turn advancement.

Design constraints:
- NO LLM calls. All price math uses bounded seeded RNG.
- Deterministic: same (scenario.seed, turn_number, allocations) → identical output.
- Turn RNG is isolated: random.Random(seed * 1_000_003 + turn_number) so that
  turn 5 never depends on whether turn 3 was replayed.
- Per-turn sigma = annualized_vol_pct / sqrt(12) for monthly mode,
  annualized_vol_pct for yearly mode.  (from CSV calibration data)
- Noise is bounded to ±3σ to prevent extreme single-turn outliers in short games.
- Event impacts fire as an immediate delta_pct on the turn they are scheduled,
  then decay residuals are applied in subsequent turns via ActiveEffect.
"""

import math
import random
from collections import defaultdict
from typing import Dict, List, Tuple

from app.core.constants import TimeMode
from app.core.regimes import REGIME_LIBRARY
from app.models.asset import SelectedAsset
from app.models.event import ActiveEffect, GameEvent
from app.models.portfolio import Allocation, Portfolio
from app.models.scenario import ScenarioState
from app.models.turn import AllocateInput, TurnInput, TurnResult

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_MONTHS_PER_YEAR = 12
_QUARTERS_PER_YEAR = 4
_INITIAL_CAPITAL = 100_000.0

# Turn-sigma scale factors relative to annualised vol
_SIGMA_SCALE: Dict[str, float] = {
    TimeMode.MONTHLY: 1.0 / math.sqrt(_MONTHS_PER_YEAR),
    TimeMode.QUARTERLY: 1.0 / math.sqrt(_QUARTERS_PER_YEAR),
    TimeMode.YEARLY: 1.0,
}

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def advance_turn(
    scenario: ScenarioState,
    turn_input: TurnInput,
) -> Tuple[ScenarioState, TurnResult]:
    """
    Advance `scenario` by one turn and return the updated state + turn result.

    This function DOES NOT write to the store — the caller is responsible for
    persisting the returned ScenarioState.

    Raises:
        ValueError: if the game is already complete or the allocations are invalid.
    """
    if scenario.is_complete:
        raise ValueError("Cannot advance a completed scenario.")

    # ── Retrieve or create the player's portfolio ────────────────────────────
    portfolio = _get_or_create_portfolio(scenario, turn_input)

    # ── Apply allocation changes if provided ────────────────────────────────
    if turn_input.new_allocations:
        portfolio = _apply_allocations(portfolio, turn_input.new_allocations, scenario.asset_classes)

    # ── Advance the turn counter ─────────────────────────────────────────────
    new_turn = scenario.current_turn + 1

    # ── Build a deterministic, turn-isolated RNG ─────────────────────────────
    # Multiplying by a large prime ensures seeds for different turns never collide.
    turn_rng = random.Random(scenario.seed * 1_000_003 + new_turn)

    # ── Collect newly-firing events ──────────────────────────────────────────
    events_this_turn, new_effects = _collect_events(scenario, new_turn)

    # ── Compute per-asset returns ────────────────────────────────────────────
    regime = REGIME_LIBRARY[scenario.regime_type]
    sigma_scale = _SIGMA_SCALE.get(scenario.time_mode, _SIGMA_SCALE[TimeMode.MONTHLY])

    # Aggregate residual deltas from active effects (from PREVIOUS turns' events)
    residual_deltas: Dict[str, float] = defaultdict(float)
    for effect in scenario.active_effects:
        residual_deltas[effect.asset_class] += effect.remaining_delta_pct

    # Immediate event deltas (events firing THIS turn)
    event_deltas: Dict[str, float] = defaultdict(float)
    for event in events_this_turn:
        for impact in event.impacts:
            event_deltas[impact.asset_class] += impact.delta_pct

    asset_returns: Dict[str, float] = {}
    for asset_class in scenario.asset_classes:
        behavior = regime.asset_behaviors.get(asset_class)
        selected = scenario.selected_assets.get(asset_class)

        if behavior is None or selected is None:
            asset_returns[asset_class] = 0.0
            continue

        asset_returns[asset_class] = _compute_asset_return(
            behavior=behavior,
            selected=selected,
            sigma_scale=sigma_scale,
            event_delta=event_deltas.get(asset_class, 0.0)
            + residual_deltas.get(asset_class, 0.0),
            rng=turn_rng,
        )

    # ── Update asset states ──────────────────────────────────────────────────
    for asset_class, turn_pct in asset_returns.items():
        state = scenario.asset_states[asset_class]
        state.current_price = round(state.current_price * (1.0 + turn_pct / 100.0), 4)
        state.price_history.append(state.current_price)
        state.turn_return_pct = round(turn_pct, 4)
        state.cumulative_return_pct = round((state.current_price / 100.0 - 1.0) * 100.0, 4)
        state.is_in_shock = abs(event_deltas.get(asset_class, 0.0)) > 3.0

    # ── Update portfolio value ───────────────────────────────────────────────
    # Only the invested portion earns market returns. Cash stays flat.
    invested_weight = sum(a.weight for a in portfolio.allocations)
    invested_value = portfolio.current_value * invested_weight
    cash_value = portfolio.cash  # cash portion is stable

    portfolio_return_pct = _weighted_return(portfolio.allocations, asset_returns)
    # portfolio_return_pct is weighted over the invested slice only;
    # scale it to the total portfolio level for reporting.
    if invested_weight > 0:
        new_invested = round(invested_value * (1.0 + portfolio_return_pct / 100.0), 2)
    else:
        new_invested = 0.0
    portfolio.current_value = round(new_invested + cash_value, 2)
    # Recompute cash as the uninvested fraction of the new total.
    portfolio.cash = round(portfolio.current_value * (1.0 - invested_weight), 2) if invested_weight < 1.0 else 0.0
    portfolio.value_history.append(portfolio.current_value)
    # Convert to total-portfolio-level return for the result.
    total_return_pct = round(((portfolio.current_value / portfolio.value_history[-2]) - 1.0) * 100.0, 4) if len(portfolio.value_history) >= 2 else 0.0

    # ── Update benchmark value ───────────────────────────────────────────────
    bench_return_pct = _benchmark_return(scenario.benchmark_weights, asset_returns)
    scenario.benchmark_state.current_value = round(
        scenario.benchmark_state.current_value * (1.0 + bench_return_pct / 100.0), 2
    )
    scenario.benchmark_state.value_history.append(scenario.benchmark_state.current_value)
    scenario.benchmark_state.cumulative_return_pct = round(
        (scenario.benchmark_state.current_value / 100.0 - 1.0) * 100.0, 4
    )

    # ── Decay existing active effects and add new ones ───────────────────────
    scenario.active_effects = _decay_effects(scenario.active_effects) + new_effects

    # ── Persist portfolio and turn counter ───────────────────────────────────
    scenario.portfolios[turn_input.player_id] = portfolio
    scenario.current_turn = new_turn
    scenario.is_complete = new_turn >= scenario.num_turns

    result = TurnResult(
        scenario_id=scenario.scenario_id,
        player_id=turn_input.player_id,
        turn_number=new_turn,
        asset_states=scenario.asset_states,
        benchmark_state=scenario.benchmark_state,
        portfolio_value=portfolio.current_value,
        portfolio_return_this_turn_pct=total_return_pct,
        portfolio_cash=portfolio.cash,
        events_this_turn=events_this_turn,
        is_game_over=scenario.is_complete,
    )

    return scenario, result


def apply_allocations(
    scenario: ScenarioState,
    alloc_input: AllocateInput,
) -> None:
    """
    Set a player's portfolio allocations WITHOUT advancing the turn.

    Mutates `scenario` in place. The caller is responsible for persisting.
    """
    portfolio = _get_or_create_portfolio(scenario, alloc_input)
    portfolio = _apply_allocations(portfolio, alloc_input.allocations, scenario.asset_classes)
    scenario.portfolios[alloc_input.player_id] = portfolio


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _get_or_create_portfolio(scenario: ScenarioState, turn_input) -> Portfolio:
    """Return existing portfolio for player_id, or create a 100% cash portfolio."""
    if turn_input.player_id in scenario.portfolios:
        return scenario.portfolios[turn_input.player_id].model_copy(deep=True)

    # Player starts with 100% cash — no investments until they allocate.
    return Portfolio(
        player_id=turn_input.player_id,
        scenario_id=scenario.scenario_id,
        initial_capital=_INITIAL_CAPITAL,
        cash=_INITIAL_CAPITAL,
        allocations=[],
        value_history=[_INITIAL_CAPITAL],
        current_value=_INITIAL_CAPITAL,
    )


def _apply_allocations(
    portfolio: Portfolio,
    new_allocs: List[Allocation],
    valid_classes: List[str],
) -> Portfolio:
    """
    Replace portfolio allocations.

    Validates:
    - All asset_classes are valid for this scenario.
    - Each weight is in [0, 1].
    - Sum of weights in [0, 1.001] — remainder is cash.

    After applying, cash = current_value × (1 − sum_of_weights).
    """
    for alloc in new_allocs:
        if alloc.asset_class not in valid_classes:
            raise ValueError(
                f"Asset class '{alloc.asset_class}' is not in this scenario. "
                f"Valid: {valid_classes}"
            )
        if not (0.0 <= alloc.weight <= 1.0):
            raise ValueError(
                f"Weight for '{alloc.asset_class}' must be in [0, 1], got {alloc.weight}."
            )

    total = sum(a.weight for a in new_allocs)
    if total > 1.001:
        raise ValueError(
            f"Allocation weights must sum to at most 1.0 (got {total:.4f})."
        )

    # Strip zero-weight allocations so they don't show as holdings.
    portfolio.allocations = [a for a in new_allocs if a.weight > 0.0]
    # Cash = the uninvested portion of current portfolio value.
    invested_weight = min(sum(a.weight for a in portfolio.allocations), 1.0)
    portfolio.cash = round(portfolio.current_value * (1.0 - invested_weight), 2)
    return portfolio


def _collect_events(
    scenario: ScenarioState,
    new_turn: int,
) -> Tuple[List[GameEvent], List[ActiveEffect]]:
    """
    Find scheduled events for `new_turn`, mark them revealed, and
    build residual ActiveEffect objects for multi-turn impacts.
    """
    events_this_turn: List[GameEvent] = []
    new_effects: List[ActiveEffect] = []

    for scheduled in scenario.event_schedule:
        if scheduled.turn == new_turn and not scheduled.revealed:
            scheduled.revealed = True
            event = scenario.events.get(scheduled.event_id)
            if event is None:
                continue
            events_this_turn.append(event)
            for impact in event.impacts:
                # Residual effects start on the NEXT turn (immediate delta is
                # already included in event_deltas this turn).
                if impact.duration_turns > 1 and abs(impact.delta_pct) >= 0.01:
                    new_effects.append(
                        ActiveEffect(
                            event_id=event.event_id,
                            asset_class=impact.asset_class,
                            remaining_delta_pct=round(
                                impact.delta_pct * impact.decay_factor, 4
                            ),
                            decay_factor=impact.decay_factor,
                            turns_remaining=impact.duration_turns - 1,
                        )
                    )

    return events_this_turn, new_effects


def _compute_asset_return(
    behavior,
    selected: SelectedAsset,
    sigma_scale: float,
    event_delta: float,
    rng: random.Random,
) -> float:
    """
    Compute the total percentage return for one asset in one turn.

    Formula:
        return = drift + noise + event_delta

    Where:
        drift  ~ Uniform(drift_range)
        noise  ~ Gaussian(0, sigma), bounded to ±3σ
        sigma  = annualized_vol_pct * sigma_scale * volatility_multiplier
    """
    drift = rng.uniform(*behavior.drift_range)

    sigma = selected.annualized_vol_pct * sigma_scale * behavior.volatility_multiplier
    if sigma > 0:
        noise = rng.gauss(0, sigma)
        noise = max(-3.0 * sigma, min(3.0 * sigma, noise))
    else:
        noise = 0.0

    return round(drift + noise + event_delta, 4)


def _weighted_return(allocations: List[Allocation], asset_returns: Dict[str, float]) -> float:
    """Compute the portfolio-weighted return (%) for one turn."""
    total = 0.0
    for alloc in allocations:
        total += alloc.weight * asset_returns.get(alloc.asset_class, 0.0)
    return total


def _benchmark_return(benchmark_weights: Dict[str, float], asset_returns: Dict[str, float]) -> float:
    """Compute the benchmark-weighted return (%) for one turn."""
    total = 0.0
    for asset_class, weight in benchmark_weights.items():
        total += weight * asset_returns.get(asset_class, 0.0)
    return total


def _decay_effects(active_effects: List[ActiveEffect]) -> List[ActiveEffect]:
    """
    Apply one round of decay to all active effects.
    Remove effects that have expired or whose remaining impact is negligible.
    """
    survivors: List[ActiveEffect] = []
    for effect in active_effects:
        next_turns = effect.turns_remaining - 1
        next_delta = round(effect.remaining_delta_pct * effect.decay_factor, 4)
        if next_turns > 0 and abs(next_delta) >= 0.01:
            survivors.append(
                ActiveEffect(
                    event_id=effect.event_id,
                    asset_class=effect.asset_class,
                    remaining_delta_pct=next_delta,
                    decay_factor=effect.decay_factor,
                    turns_remaining=next_turns,
                )
            )
    return survivors
