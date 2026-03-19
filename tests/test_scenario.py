"""
Tests for /scenario/create — scenario generation and determinism.
Run with: pytest tests/test_scenario.py -v
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _base_payload(**overrides) -> dict:
    payload = {
        "game_mode": "sandbox",
        "time_mode": "monthly",
        "ai_level": 1,
        "difficulty": "beginner",
        "asset_classes": ["equities", "bonds", "gold"],
        "seed": 42,
    }
    payload.update(overrides)
    return payload


# ---------------------------------------------------------------------------
# Basic creation tests
# ---------------------------------------------------------------------------

def test_create_scenario_returns_200():
    resp = client.post("/scenario/create", json=_base_payload())
    assert resp.status_code == 200


def test_create_scenario_has_correct_structure():
    resp = client.post("/scenario/create", json=_base_payload())
    data = resp.json()

    assert "scenario_id" in data
    assert "regime_type" in data
    assert "regime_label" in data
    assert "asset_states" in data
    assert "benchmark_state" in data
    assert "events" in data
    assert "event_schedule" in data
    assert data["current_turn"] == 0
    assert data["is_complete"] is False


def test_default_turns_beginner_monthly():
    resp = client.post("/scenario/create", json=_base_payload())
    data = resp.json()
    assert data["num_turns"] == 24


def test_default_turns_beginner_yearly():
    resp = client.post("/scenario/create", json=_base_payload(time_mode="yearly"))
    data = resp.json()
    assert data["num_turns"] == 10


def test_default_turns_intermediate_monthly():
    resp = client.post(
        "/scenario/create",
        json=_base_payload(difficulty="intermediate"),
    )
    data = resp.json()
    assert data["num_turns"] == 36


def test_default_turns_advanced_monthly():
    resp = client.post(
        "/scenario/create",
        json=_base_payload(difficulty="advanced"),
    )
    data = resp.json()
    assert data["num_turns"] == 60


def test_custom_num_turns():
    resp = client.post("/scenario/create", json=_base_payload(num_turns=12))
    data = resp.json()
    assert data["num_turns"] == 12


# ---------------------------------------------------------------------------
# Asset state tests
# ---------------------------------------------------------------------------

def test_asset_states_match_requested_classes():
    resp = client.post("/scenario/create", json=_base_payload())
    data = resp.json()
    assert set(data["asset_states"].keys()) == {"equities", "bonds", "gold"}


def test_all_asset_classes():
    payload = _base_payload(
        asset_classes=["equities", "bonds", "fx", "gold", "crypto"],
        difficulty="advanced",
    )
    resp = client.post("/scenario/create", json=payload)
    data = resp.json()
    assert set(data["asset_states"].keys()) == {"equities", "bonds", "fx", "gold", "crypto"}


def test_asset_prices_start_at_100():
    resp = client.post("/scenario/create", json=_base_payload())
    data = resp.json()
    for ac, state in data["asset_states"].items():
        assert state["current_price"] == 100.0, f"{ac} should start at 100.0"
        assert state["price_history"] == [100.0]
        assert state["cumulative_return_pct"] == 0.0


def test_benchmark_starts_at_100():
    resp = client.post("/scenario/create", json=_base_payload())
    data = resp.json()
    assert data["benchmark_state"]["current_value"] == 100.0


# ---------------------------------------------------------------------------
# Determinism tests
# ---------------------------------------------------------------------------

def test_same_seed_produces_same_regime():
    payload = _base_payload(seed=12345, difficulty="intermediate")
    r1 = client.post("/scenario/create", json=payload).json()
    r2 = client.post("/scenario/create", json=payload).json()
    assert r1["regime_type"] == r2["regime_type"]
    assert r1["regime_label"] == r2["regime_label"]


def test_same_seed_produces_same_event_schedule_length():
    payload = _base_payload(seed=99999, asset_classes=["equities", "bonds", "crypto"])
    r1 = client.post("/scenario/create", json=payload).json()
    r2 = client.post("/scenario/create", json=payload).json()
    assert len(r1["event_schedule"]) == len(r2["event_schedule"])


def test_same_seed_produces_same_event_turns():
    payload = _base_payload(seed=55555)
    r1 = client.post("/scenario/create", json=payload).json()
    r2 = client.post("/scenario/create", json=payload).json()
    turns_1 = [e["turn"] for e in r1["event_schedule"]]
    turns_2 = [e["turn"] for e in r2["event_schedule"]]
    assert turns_1 == turns_2


def test_different_seeds_produce_different_scenario_ids():
    r1 = client.post("/scenario/create", json=_base_payload(seed=1)).json()
    r2 = client.post("/scenario/create", json=_base_payload(seed=2)).json()
    assert r1["scenario_id"] != r2["scenario_id"]


# ---------------------------------------------------------------------------
# Regime override tests
# ---------------------------------------------------------------------------

def test_regime_override_respected():
    payload = _base_payload(regime_override="banking_panic", difficulty="advanced")
    data = client.post("/scenario/create", json=payload).json()
    assert data["regime_type"] == "banking_panic"


def test_regime_override_post_crash_recovery():
    payload = _base_payload(regime_override="post_crash_recovery")
    data = client.post("/scenario/create", json=payload).json()
    assert data["regime_type"] == "post_crash_recovery"


def test_invalid_regime_override_returns_422():
    payload = _base_payload(regime_override="made_up_regime")
    resp = client.post("/scenario/create", json=payload)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Event schedule tests
# ---------------------------------------------------------------------------

def test_event_schedule_is_sorted_by_turn():
    data = client.post("/scenario/create", json=_base_payload()).json()
    turns = [e["turn"] for e in data["event_schedule"]]
    assert turns == sorted(turns)


def test_events_reference_valid_event_ids():
    data = client.post("/scenario/create", json=_base_payload()).json()
    event_ids = set(data["events"].keys())
    for entry in data["event_schedule"]:
        assert entry["event_id"] in event_ids, (
            f"Scheduled event_id {entry['event_id']} not found in events dict"
        )


def test_events_have_at_least_one_major():
    """Every scenario should include at least one MAJOR event."""
    data = client.post("/scenario/create", json=_base_payload(num_turns=24)).json()
    severities = [e["severity"] for e in data["events"].values()]
    assert "major" in severities


def test_event_turns_within_bounds():
    data = client.post("/scenario/create", json=_base_payload()).json()
    num_turns = data["num_turns"]
    for entry in data["event_schedule"]:
        assert 1 <= entry["turn"] < num_turns, (
            f"Event scheduled at turn {entry['turn']} is out of bounds [1, {num_turns})"
        )


# ---------------------------------------------------------------------------
# GET /scenario/{id} tests
# ---------------------------------------------------------------------------

def test_get_existing_scenario():
    created = client.post("/scenario/create", json=_base_payload()).json()
    scenario_id = created["scenario_id"]
    fetched = client.get(f"/scenario/{scenario_id}").json()
    assert fetched["scenario_id"] == scenario_id
    assert fetched["regime_type"] == created["regime_type"]


def test_get_nonexistent_scenario_returns_404():
    resp = client.get("/scenario/does-not-exist-abc123")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Seed persistence tests
# ---------------------------------------------------------------------------

def test_seed_is_recorded_in_state():
    payload = _base_payload(seed=7777)
    data = client.post("/scenario/create", json=payload).json()
    assert data["seed"] == 7777


def test_auto_seed_is_recorded_when_omitted():
    payload = _base_payload()
    del payload["seed"]
    data = client.post("/scenario/create", json=payload).json()
    assert isinstance(data["seed"], int)
    assert data["seed"] > 0


# ---------------------------------------------------------------------------
# Game mode / AI level correctness
# ---------------------------------------------------------------------------

def test_ranked_mode_ai_level_3():
    payload = _base_payload(game_mode="ranked", ai_level=3, difficulty="advanced")
    data = client.post("/scenario/create", json=payload).json()
    assert data["game_mode"] == "ranked"
    assert data["ai_level"] == 3


def test_battle_mode():
    payload = _base_payload(game_mode="battle", ai_level=2, difficulty="intermediate")
    data = client.post("/scenario/create", json=payload).json()
    assert data["game_mode"] == "battle"
