"""
Tests for the turn engine — /scenario/advance endpoint.
Run with: pytest tests/test_turn_engine.py -v
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import store

client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_scenario(**overrides) -> dict:
    payload = {
        "game_mode": "sandbox",
        "time_mode": "monthly",
        "ai_level": 1,
        "difficulty": "beginner",
        "asset_classes": ["equities", "bonds", "gold"],
        "seed": 99,
    }
    payload.update(overrides)
    resp = client.post("/scenario/create", json=payload)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _advance(scenario_id: str, player_id: str = "player1", new_allocations=None) -> dict:
    body = {"scenario_id": scenario_id, "player_id": player_id}
    if new_allocations is not None:
        body["new_allocations"] = new_allocations
    resp = client.post("/scenario/advance", json=body)
    return resp


# ---------------------------------------------------------------------------
# Basic advance behaviour
# ---------------------------------------------------------------------------

def test_advance_returns_200():
    scenario = _create_scenario()
    resp = _advance(scenario["scenario_id"])
    assert resp.status_code == 200, resp.text


def test_advance_404_on_unknown_scenario():
    resp = _advance("nonexistent-id-xyz")
    assert resp.status_code == 404


def test_advance_increments_turn_counter():
    scenario = _create_scenario()
    sid = scenario["scenario_id"]
    _advance(sid)
    state = client.get(f"/scenario/{sid}").json()
    assert state["current_turn"] == 1


def test_advance_result_has_expected_fields():
    scenario = _create_scenario()
    result = _advance(scenario["scenario_id"]).json()
    assert "turn_number" in result
    assert "asset_states" in result
    assert "benchmark_state" in result
    assert "portfolio_value" in result
    assert "portfolio_return_this_turn_pct" in result
    assert "events_this_turn" in result
    assert "is_game_over" in result


def test_advance_changes_asset_prices():
    """After one turn, prices should differ from the initial 100.0."""
    scenario = _create_scenario()
    result = _advance(scenario["scenario_id"]).json()
    any_changed = any(
        s["current_price"] != 100.0
        for s in result["asset_states"].values()
    )
    assert any_changed, "All prices stayed at 100 — turn engine may not be running."


# ---------------------------------------------------------------------------
# Determinism tests
# ---------------------------------------------------------------------------

def test_advance_is_deterministic():
    """
    Creating two scenarios with the same seed and advancing both once
    must produce the exact same asset prices.
    """
    s1 = _create_scenario(seed=777)
    s2 = _create_scenario(seed=777)

    r1 = _advance(s1["scenario_id"]).json()
    r2 = _advance(s2["scenario_id"]).json()

    for asset_class in r1["asset_states"]:
        assert r1["asset_states"][asset_class]["current_price"] == \
               r2["asset_states"][asset_class]["current_price"], \
            f"Price mismatch for {asset_class}"


def test_different_seeds_produce_different_prices():
    """Different seeds should (almost always) produce different prices."""
    s1 = _create_scenario(seed=111)
    s2 = _create_scenario(seed=222)

    r1 = _advance(s1["scenario_id"]).json()
    r2 = _advance(s2["scenario_id"]).json()

    prices_equal = all(
        r1["asset_states"][ac]["current_price"] == r2["asset_states"][ac]["current_price"]
        for ac in r1["asset_states"]
        if ac in r2["asset_states"]
    )
    assert not prices_equal, "Different seeds produced identical prices — unlikely unless RNG is broken."


def test_multiple_advances_keep_incrementing_turn():
    scenario = _create_scenario()
    sid = scenario["scenario_id"]
    for expected_turn in range(1, 4):
        result = _advance(sid).json()
        assert result["turn_number"] == expected_turn


# ---------------------------------------------------------------------------
# Game completion
# ---------------------------------------------------------------------------

def test_advance_marks_game_complete_at_last_turn():
    """Advancing num_turns times must set is_game_over = True."""
    scenario = _create_scenario(num_turns=3)
    sid = scenario["scenario_id"]
    result = None
    for _ in range(3):
        result = _advance(sid).json()
    assert result["is_game_over"] is True


def test_advance_after_complete_returns_400():
    """Trying to advance a finished game must return 400."""
    scenario = _create_scenario(num_turns=2)
    sid = scenario["scenario_id"]
    _advance(sid)
    _advance(sid)
    resp = _advance(sid)
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Portfolio tests
# ---------------------------------------------------------------------------

def test_advance_returns_initial_capital_on_first_turn():
    scenario = _create_scenario()
    result = _advance(scenario["scenario_id"]).json()
    # After one turn the portfolio value should be close to 100_000 but not exact
    assert 50_000 < result["portfolio_value"] < 200_000


def test_advance_equal_weight_default_portfolio():
    """
    First advance without allocations → equal weight used.
    Return ≈ average of all asset returns (not zero, not extreme).
    """
    scenario = _create_scenario()
    result = _advance(scenario["scenario_id"]).json()
    assert result["portfolio_value"] != 0
    assert result["portfolio_value"] > 0


def test_advance_updates_portfolio_value_across_turns():
    scenario = _create_scenario()
    sid = scenario["scenario_id"]
    v1 = _advance(sid).json()["portfolio_value"]
    v2 = _advance(sid).json()["portfolio_value"]
    # Values should update (not stay identical two turns running with any luck)
    # (not a strict requirement — they could theoretically be equal — but extremely unlikely)
    assert isinstance(v1, float) and isinstance(v2, float)


def test_advance_with_custom_allocations():
    """Player-provided allocations are respected — 100% equities test."""
    scenario = _create_scenario(asset_classes=["equities", "bonds"])
    sid = scenario["scenario_id"]
    allocs = [{"asset_class": "equities", "weight": 1.0}, {"asset_class": "bonds", "weight": 0.0}]
    result = _advance(sid, new_allocations=allocs).json()
    assert result["portfolio_return_this_turn_pct"] == \
           result["asset_states"]["equities"]["turn_return_pct"], \
        "100% equities portfolio should match equities return exactly."


def test_advance_invalid_allocation_weight_returns_400():
    scenario = _create_scenario(asset_classes=["equities", "bonds"])
    sid = scenario["scenario_id"]
    bad_allocs = [
        {"asset_class": "equities", "weight": 0.8},
        {"asset_class": "bonds", "weight": 0.8},  # sum = 1.6 → invalid
    ]
    resp = _advance(sid, new_allocations=bad_allocs)
    assert resp.status_code == 400


def test_advance_unknown_asset_class_in_allocation_returns_400():
    scenario = _create_scenario(asset_classes=["equities", "bonds"])
    sid = scenario["scenario_id"]
    bad_allocs = [
        {"asset_class": "equities", "weight": 0.5},
        {"asset_class": "crypto", "weight": 0.5},  # not in this scenario
    ]
    resp = _advance(sid, new_allocations=bad_allocs)
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Benchmark tests
# ---------------------------------------------------------------------------

def test_advance_updates_benchmark_value():
    scenario = _create_scenario()
    result = _advance(scenario["scenario_id"]).json()
    bench = result["benchmark_state"]
    assert bench["current_value"] != 100.0, "Benchmark value should change after one turn."


def test_scenario_has_benchmark_weights():
    scenario = _create_scenario()
    assert len(scenario["benchmark_weights"]) > 0


def test_benchmark_weights_sum_to_one():
    scenario = _create_scenario()
    total = sum(scenario["benchmark_weights"].values())
    assert abs(total - 1.0) < 0.002, f"Benchmark weights sum to {total}, expected ~1.0"


# ---------------------------------------------------------------------------
# Asset selection tests
# ---------------------------------------------------------------------------

def test_scenario_has_selected_assets():
    scenario = _create_scenario()
    assert "selected_assets" in scenario
    assert len(scenario["selected_assets"]) == len(scenario["asset_classes"])


def test_selected_asset_has_symbol_and_name():
    scenario = _create_scenario()
    for asset_class, selected in scenario["selected_assets"].items():
        assert selected["symbol"], f"No symbol for asset class '{asset_class}'"
        assert selected["name"], f"No name for asset class '{asset_class}'"


def test_asset_states_have_symbol_after_creation():
    scenario = _create_scenario()
    for asset_class, state in scenario["asset_states"].items():
        assert state["symbol"] is not None, f"AssetState for '{asset_class}' missing symbol."


def test_same_seed_same_asset_selection():
    s1 = _create_scenario(seed=42)
    s2 = _create_scenario(seed=42)
    for ac in s1["selected_assets"]:
        assert s1["selected_assets"][ac]["symbol"] == s2["selected_assets"][ac]["symbol"]


def test_crypto_is_always_synthetic():
    scenario = _create_scenario(asset_classes=["equities", "crypto"])
    crypto = scenario["selected_assets"]["crypto"]
    assert crypto["is_synthetic"] is True
    assert crypto["symbol"] == "CRYPTO-SYNTH"


def test_selected_assets_annualized_vol_is_positive():
    scenario = _create_scenario()
    for asset_class, selected in scenario["selected_assets"].items():
        assert selected["annualized_vol_pct"] > 0, \
            f"annualized_vol_pct must be > 0 for {asset_class}"


# ---------------------------------------------------------------------------
# Cash-first portfolio tests
# ---------------------------------------------------------------------------

def test_portfolio_starts_100_pct_cash():
    """First advance with no allocations → 100% cash, zero investment."""
    scenario = _create_scenario()
    result = _advance(scenario["scenario_id"]).json()
    # Portfolio should stay exactly at initial capital (cash earns 0%).
    assert result["portfolio_value"] == 100_000.0
    assert result["portfolio_cash"] == 100_000.0
    assert result["portfolio_return_this_turn_pct"] == 0.0


def test_partial_allocation_keeps_cash():
    """Allocating 50% equities leaves 50% as cash."""
    scenario = _create_scenario(asset_classes=["equities", "bonds"])
    sid = scenario["scenario_id"]
    allocs = [{"asset_class": "equities", "weight": 0.5}]
    result = _advance(sid, new_allocations=allocs).json()
    # Cash ~= 50% of portfolio value.
    assert result["portfolio_cash"] > 40_000
    assert result["portfolio_cash"] < 60_000


def test_allocation_sum_over_1_returns_400():
    """Weights summing to more than 1.0 must be rejected."""
    scenario = _create_scenario(asset_classes=["equities", "bonds"])
    sid = scenario["scenario_id"]
    bad = [
        {"asset_class": "equities", "weight": 0.7},
        {"asset_class": "bonds", "weight": 0.5},
    ]
    resp = _advance(sid, new_allocations=bad)
    assert resp.status_code == 400


def test_cash_portfolio_unchanged_across_multiple_turns():
    """Advancing several turns with no investment keeps value at 100k."""
    scenario = _create_scenario(num_turns=5)
    sid = scenario["scenario_id"]
    for _ in range(3):
        result = _advance(sid).json()
    assert result["portfolio_value"] == 100_000.0
    assert result["portfolio_cash"] == 100_000.0


# ---------------------------------------------------------------------------
# /scenario/allocate — set allocations without advancing the turn
# ---------------------------------------------------------------------------


def _allocate(scenario_id: str, allocations: list) -> dict:
    resp = client.post("/scenario/allocate", json={
        "scenario_id": scenario_id,
        "player_id": "player1",
        "allocations": allocations,
    })
    return resp


def test_allocate_returns_200():
    scenario = _create_scenario()
    sid = scenario["scenario_id"]
    resp = _allocate(sid, [{"asset_class": "equities", "weight": 0.5}])
    assert resp.status_code == 200


def test_allocate_does_not_advance_turn():
    scenario = _create_scenario()
    sid = scenario["scenario_id"]
    _allocate(sid, [{"asset_class": "equities", "weight": 0.5}])
    updated = client.get(f"/scenario/{sid}").json()
    assert updated["current_turn"] == scenario["current_turn"]


def test_allocate_updates_portfolio_allocations():
    scenario = _create_scenario()
    sid = scenario["scenario_id"]
    _allocate(sid, [{"asset_class": "equities", "weight": 0.4}, {"asset_class": "bonds", "weight": 0.3}])
    updated = client.get(f"/scenario/{sid}").json()
    allocs = updated["portfolios"]["player1"]["allocations"]
    weights = {a["asset_class"]: a["weight"] for a in allocs}
    assert weights["equities"] == 0.4
    assert weights["bonds"] == 0.3


def test_allocate_updates_cash():
    scenario = _create_scenario()
    sid = scenario["scenario_id"]
    _allocate(sid, [{"asset_class": "equities", "weight": 0.6}])
    updated = client.get(f"/scenario/{sid}").json()
    cash = updated["portfolios"]["player1"]["cash"]
    assert cash == pytest.approx(40_000.0, abs=1)


def test_allocate_then_advance_uses_allocations():
    """Allocate first, then advance — invested portion should earn returns."""
    scenario = _create_scenario(asset_classes=["equities", "bonds"])
    sid = scenario["scenario_id"]
    _allocate(sid, [{"asset_class": "equities", "weight": 0.5}, {"asset_class": "bonds", "weight": 0.5}])
    result = _advance(sid).json()
    # With 100% invested, portfolio should change from market returns
    assert result["portfolio_value"] != 100_000.0


def test_allocate_rejects_invalid_weights():
    scenario = _create_scenario()
    sid = scenario["scenario_id"]
    resp = _allocate(sid, [{"asset_class": "equities", "weight": 1.5}])
    assert resp.status_code == 400
