"""
In-memory scenario store.
For the MVP / hackathon only — swap for Redis or a database in production.
"""

from typing import Dict, Optional

from app.models.scenario import ScenarioState

_store: Dict[str, ScenarioState] = {}


def save(state: ScenarioState) -> None:
    _store[state.scenario_id] = state


def get(scenario_id: str) -> Optional[ScenarioState]:
    return _store.get(scenario_id)


def delete(scenario_id: str) -> None:
    _store.pop(scenario_id, None)


def list_ids() -> list:
    return list(_store.keys())
