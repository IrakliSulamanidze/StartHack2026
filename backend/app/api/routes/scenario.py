from fastapi import APIRouter, HTTPException

from app.models.scenario import ScenarioConfig, ScenarioState
from app.models.turn import AllocateInput, TurnInput, TurnResult
from app.services import store
from app.services.scenario_service import create_scenario
from app.services.turn_engine import advance_turn, apply_allocations
from app.services.news_adapter import generate_news_for_turn

router = APIRouter()


@router.post("/create", response_model=ScenarioState, summary="Create a new scenario")
def create_scenario_endpoint(config: ScenarioConfig) -> ScenarioState:
    """
    Generate a new, fully initialised game scenario.

    The response includes:
    - A unique scenario_id for subsequent calls.
    - The selected market regime.
    - All pre-generated events (timetabled but not yet revealed).
    - Initial asset states (all indexed at 100.0).
    - The reference benchmark for this regime.
    """
    try:
        state = create_scenario(config)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    store.save(state)
    return state


@router.get("/{scenario_id}", response_model=ScenarioState, summary="Get an existing scenario")
def get_scenario(scenario_id: str) -> ScenarioState:
    """Fetch the current state of a scenario by ID."""
    state = store.get(scenario_id)
    if state is None:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")
    return state


@router.post("/allocate", response_model=ScenarioState, summary="Set allocations without advancing the turn")
def allocate_endpoint(alloc_input: AllocateInput) -> ScenarioState:
    """
    Update a player's portfolio allocations without advancing the turn.

    Use this to invest or rebalance. The turn is NOT advanced —
    call /advance separately to progress time.
    """
    state = store.get(alloc_input.scenario_id)
    if state is None:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario '{alloc_input.scenario_id}' not found.",
        )
    try:
        apply_allocations(state, alloc_input)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    store.save(state)
    return state


@router.post("/advance", response_model=TurnResult, summary="Advance the scenario by one turn")
def advance_scenario(turn_input: TurnInput) -> TurnResult:
    """
    Advance the scenario by one turn.

    Applies:
    - Player allocation changes (or holds current ones if None).
    - Regime-based asset price updates (bounded, deterministic).
    - Triggered events for this turn.
    - Portfolio and benchmark value updates.
    """
    state = store.get(turn_input.scenario_id)
    if state is None:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario '{turn_input.scenario_id}' not found.",
        )
    try:
        updated_state, result = advance_turn(state, turn_input)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    store.save(updated_state)

    # Narrative-only news — runs AFTER deterministic turn is final.
    result.news = generate_news_for_turn(updated_state, result)

    # Persist news into scenario state so GET returns full history.
    if result.news is not None:
        updated_state.news_history[result.turn_number] = result.news
        store.save(updated_state)

    return result
