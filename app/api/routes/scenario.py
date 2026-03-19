from fastapi import APIRouter, HTTPException

from app.models.scenario import ScenarioConfig, ScenarioState
from app.models.turn import TurnInput, TurnResult
from app.services import store
from app.services.scenario_service import create_scenario

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


@router.post("/advance", response_model=TurnResult, summary="Advance the scenario by one turn")
def advance_scenario(turn_input: TurnInput) -> TurnResult:
    """
    Advance the scenario by one turn.

    Applies:
    - Player allocation changes (or holds current ones if None).
    - Regime-based asset price updates (bounded, deterministic).
    - Triggered events for this turn.
    - Portfolio and benchmark value updates.

    NOTE: Turn engine is implemented in Phase 2.
    """
    raise HTTPException(
        status_code=501,
        detail="Turn engine is not yet implemented. Coming in Phase 2.",
    )
