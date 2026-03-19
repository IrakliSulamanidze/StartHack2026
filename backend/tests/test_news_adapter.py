"""
Tests for news adapter integration — backend/app/services/news_adapter.py
and the wiring in /scenario/advance.

Run with: pytest tests/test_news_adapter.py -v
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.services import store
from app.services.news_adapter import (
    _map_category,
    _compute_severity_score,
    _compute_directional_impact,
    generate_news_for_turn,
)
from app.core.constants import EventSeverity, EventType
from app.models.event import GameEvent, EventImpact
from app.models.news import NewsArticle

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
        "seed": 42,
    }
    payload.update(overrides)
    resp = client.post("/scenario/create", json=payload)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _advance(scenario_id: str, player_id: str = "player1") -> dict:
    body = {"scenario_id": scenario_id, "player_id": player_id}
    return client.post("/scenario/advance", json=body)


def _make_event(
    event_type=EventType.CENTRAL_BANK_DECISION,
    severity=EventSeverity.ORDINARY,
    delta_pct=1.0,
) -> GameEvent:
    return GameEvent(
        event_id="test-evt-1",
        title="Test Event",
        type=event_type,
        severity=severity,
        affected_assets=["equities"],
        impacts=[
            EventImpact(
                asset_class="equities",
                delta_pct=delta_pct,
                duration_turns=1,
                decay_factor=0.5,
            )
        ],
        turn=1,
        description="A test event.",
    )


# ---------------------------------------------------------------------------
# Unit: _map_category
# ---------------------------------------------------------------------------

class TestMapCategory:
    def test_ordinary_central_bank(self):
        event = _make_event(EventType.CENTRAL_BANK_DECISION, EventSeverity.ORDINARY)
        assert _map_category(event) == "daily_macro_watch"

    def test_impactful_inflation(self):
        event = _make_event(EventType.INFLATION_SURPRISE, EventSeverity.IMPACTFUL)
        assert _map_category(event) == "inflation_surprise"

    def test_major_banking_stress(self):
        event = _make_event(EventType.BANKING_STRESS, EventSeverity.MAJOR)
        assert _map_category(event) == "banking_panic"

    def test_major_geopolitical(self):
        event = _make_event(EventType.GEOPOLITICAL_ESCALATION, EventSeverity.MAJOR)
        assert _map_category(event) == "war_escalation"


# ---------------------------------------------------------------------------
# Unit: _compute_severity_score
# ---------------------------------------------------------------------------

class TestComputeSeverityScore:
    def test_small_impact_returns_1(self):
        event = _make_event(delta_pct=0.3)
        assert _compute_severity_score(event) == 1

    def test_moderate_impact_returns_2(self):
        event = _make_event(delta_pct=1.5)
        assert _compute_severity_score(event) == 2

    def test_medium_impact_returns_3(self):
        event = _make_event(delta_pct=3.0)
        assert _compute_severity_score(event) == 3

    def test_large_impact_returns_4(self):
        event = _make_event(delta_pct=6.0)
        assert _compute_severity_score(event) == 4

    def test_extreme_impact_returns_5(self):
        event = _make_event(delta_pct=-10.0)
        assert _compute_severity_score(event) == 5

    def test_no_impacts_returns_2(self):
        event = _make_event()
        event.impacts = []
        assert _compute_severity_score(event) == 2


# ---------------------------------------------------------------------------
# Unit: _compute_directional_impact
# ---------------------------------------------------------------------------

class TestComputeDirectionalImpact:
    def test_positive_delta(self):
        event = _make_event(delta_pct=2.0)
        result = _compute_directional_impact(event)
        assert result["equities"] == "positive"

    def test_strongly_negative_delta(self):
        event = _make_event(delta_pct=-5.0)
        result = _compute_directional_impact(event)
        assert result["equities"] == "strongly_negative"

    def test_neutral_delta(self):
        event = _make_event(delta_pct=0.1)
        result = _compute_directional_impact(event)
        assert result["equities"] == "neutral"

    def test_strongly_positive_delta(self):
        event = _make_event(delta_pct=4.0)
        result = _compute_directional_impact(event)
        assert result["equities"] == "strongly_positive"


# ---------------------------------------------------------------------------
# Integration: advance endpoint includes news field
# ---------------------------------------------------------------------------

class TestAdvanceWithNews:
    def test_advance_response_has_news_field(self):
        """The advance response must always include a 'news' key."""
        scenario = _create_scenario(seed=42)
        resp = _advance(scenario["scenario_id"])
        assert resp.status_code == 200
        data = resp.json()
        # news is either a typed object or null — but the key must exist.
        assert "news" in data

    def test_news_matches_typed_schema_when_present(self):
        """When news is non-null, it must validate against NewsArticle."""
        from app.models.news import NewsArticle as NA, NewsHistoricalExample
        fake_article = NA(
            headline="Test Headline",
            short_bulletin="Short bulletin text.",
            beginner_explanation="This means X happened.",
            historical_example=NewsHistoricalExample(
                title="1987 Black Monday",
                why_similar="Both involved sudden drops",
                what_happened="Markets fell 22% in one day",
                beginner_takeaway="Diversification helps",
                source_event_ids=["evt-001"],
            ),
            selected_event_ids=["evt-001"],
            generation_mode="template_only",
            validation_flags=[],
        )
        scenario = _create_scenario(seed=42)
        with patch(
            "app.api.routes.scenario.generate_news_for_turn",
            return_value=fake_article,
        ):
            resp = _advance(scenario["scenario_id"])
        assert resp.status_code == 200
        data = resp.json()
        news = data["news"]
        assert news is not None
        # Round-trip: JSON → NewsArticle must succeed.
        parsed = NewsArticle(**news)
        assert parsed.headline == "Test Headline"
        assert parsed.short_bulletin == "Short bulletin text."
        assert parsed.generation_mode == "template_only"
        assert parsed.historical_example is not None
        assert parsed.historical_example.title == "1987 Black Monday"
        assert parsed.selected_event_ids == ["evt-001"]

    def test_advance_still_works_when_composer_import_fails(self):
        """If news_agent is not importable, advance must still succeed."""
        with patch(
            "app.api.routes.scenario.generate_news_for_turn",
            return_value=None,
        ):
            scenario = _create_scenario(seed=55)
            resp = _advance(scenario["scenario_id"])
            assert resp.status_code == 200
            data = resp.json()
            assert data["news"] is None

    def test_advance_still_works_when_news_adapter_raises(self):
        """The adapter itself never raises — verify that contract directly."""
        scenario = _create_scenario(seed=66)
        state = store.get(scenario["scenario_id"])
        # Advance to get a real TurnResult
        resp = _advance(scenario["scenario_id"])
        assert resp.status_code == 200
        from app.models.turn import TurnResult
        turn_result = TurnResult(**resp.json())
        # Even if the internal compose_article raises, the adapter catches it.
        with patch(
            "app.services.news_adapter.compose_article",
            side_effect=RuntimeError("Boom"),
            create=True,
        ):
            result = generate_news_for_turn(state, turn_result)
        # Adapter swallows the error and returns None.
        assert result is None


class TestAdapterSafety:
    """Tests that the adapter function itself never raises."""

    def test_generate_handles_import_error(self):
        """When news_agent is not installed, returns None."""
        # The adapter does a lazy import of news_agent.composer inside the
        # function body.  Simulate ImportError by temporarily removing
        # the module from sys.modules and patching __import__.
        import builtins
        real_import = builtins.__import__

        def _fake_import(name, *args, **kwargs):
            if name.startswith("news_agent"):
                raise ImportError("simulated: news_agent not installed")
            return real_import(name, *args, **kwargs)

        scenario = _create_scenario(seed=77)
        state = store.get(scenario["scenario_id"])

        # Build a TurnResult with one event so the adapter tries to import.
        resp = _advance(scenario["scenario_id"])
        turn_result_raw = resp.json()

        # Reconstruct a TurnResult with at least one event so the adapter
        # doesn't short-circuit on empty events_this_turn.
        from app.models.turn import TurnResult
        turn_result = TurnResult(**turn_result_raw)

        if not turn_result.events_this_turn:
            # No events to trigger the import path — this seed/turn has none.
            # Just verify None for no-events case.
            result = generate_news_for_turn(state, turn_result)
            assert result is None
            return

        with patch.object(builtins, "__import__", side_effect=_fake_import):
            result = generate_news_for_turn(state, turn_result)
        assert result is None

    def test_generate_returns_none_for_no_events(self):
        """When no events fired, returns None immediately."""
        scenario = _create_scenario(seed=88)
        state = store.get(scenario["scenario_id"])
        mock_result = MagicMock()
        mock_result.events_this_turn = []
        result = generate_news_for_turn(state, mock_result)
        assert result is None


# ---------------------------------------------------------------------------
# Determinism: news does not affect prices
# ---------------------------------------------------------------------------

class TestNewsDeterminism:
    def test_prices_unchanged_with_or_without_news(self):
        """News generation must not alter deterministic price computation.

        Create two identical scenarios with the same seed. Advance both.
        Asset prices and portfolio values must be identical regardless of
        whether the news adapter succeeds or is mocked out.
        """
        s1 = _create_scenario(seed=12345)
        s2 = _create_scenario(seed=12345)

        r1 = _advance(s1["scenario_id"]).json()

        with patch(
            "app.api.routes.scenario.generate_news_for_turn",
            return_value=None,
        ):
            r2 = _advance(s2["scenario_id"]).json()

        for ac in r1["asset_states"]:
            assert r1["asset_states"][ac]["current_price"] == \
                   r2["asset_states"][ac]["current_price"], \
                f"Price mismatch for {ac} — news may have affected determinism."

        assert r1["portfolio_value"] == r2["portfolio_value"]
        assert r1["benchmark_state"]["current_value"] == \
               r2["benchmark_state"]["current_value"]


# ---------------------------------------------------------------------------
# Persistence: news survives reload via GET /scenario/{id}
# ---------------------------------------------------------------------------

class TestNewsPersistence:
    def _fake_article(self, headline: str = "Persisted Headline") -> NewsArticle:
        return NewsArticle(
            headline=headline,
            short_bulletin="Persisted bulletin.",
            beginner_explanation="Persisted explanation.",
            historical_example=None,
            selected_event_ids=[],
            generation_mode="template_only",
            validation_flags=[],
        )

    def test_news_history_persisted_after_advance(self):
        """GET /scenario/{id} includes news_history after advance."""
        scenario = _create_scenario(seed=100)
        sid = scenario["scenario_id"]
        with patch(
            "app.api.routes.scenario.generate_news_for_turn",
            return_value=self._fake_article(),
        ):
            resp = _advance(sid)
            assert resp.status_code == 200

        # Reload via GET
        state = client.get(f"/scenario/{sid}").json()
        assert "news_history" in state
        assert "1" in state["news_history"]
        assert state["news_history"]["1"]["headline"] == "Persisted Headline"

    def test_news_history_accumulates_over_turns(self):
        """Multiple advances accumulate distinct news entries."""
        scenario = _create_scenario(seed=200)
        sid = scenario["scenario_id"]

        for turn in range(1, 4):
            article = self._fake_article(headline=f"Turn {turn} News")
            with patch(
                "app.api.routes.scenario.generate_news_for_turn",
                return_value=article,
            ):
                resp = _advance(sid)
                assert resp.status_code == 200

        state = client.get(f"/scenario/{sid}").json()
        assert len(state["news_history"]) == 3
        assert state["news_history"]["1"]["headline"] == "Turn 1 News"
        assert state["news_history"]["2"]["headline"] == "Turn 2 News"
        assert state["news_history"]["3"]["headline"] == "Turn 3 News"

    def test_news_history_empty_when_no_news(self):
        """When adapter returns None, news_history stays empty."""
        scenario = _create_scenario(seed=300)
        sid = scenario["scenario_id"]
        with patch(
            "app.api.routes.scenario.generate_news_for_turn",
            return_value=None,
        ):
            _advance(sid)

        state = client.get(f"/scenario/{sid}").json()
        assert state["news_history"] == {}

    def test_news_does_not_alter_prices(self):
        """Prices are identical with and without news persistence."""
        s1 = _create_scenario(seed=400)
        s2 = _create_scenario(seed=400)

        with patch(
            "app.api.routes.scenario.generate_news_for_turn",
            return_value=self._fake_article(),
        ):
            r1 = _advance(s1["scenario_id"]).json()

        with patch(
            "app.api.routes.scenario.generate_news_for_turn",
            return_value=None,
        ):
            r2 = _advance(s2["scenario_id"]).json()

        for ac in r1["asset_states"]:
            assert r1["asset_states"][ac]["current_price"] == \
                   r2["asset_states"][ac]["current_price"]
        assert r1["portfolio_value"] == r2["portfolio_value"]

    def test_create_scenario_has_empty_news_history(self):
        """Newly created scenario starts with empty news_history."""
        scenario = _create_scenario(seed=500)
        assert scenario.get("news_history") == {}
