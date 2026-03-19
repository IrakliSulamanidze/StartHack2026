"""
Tests for the composer layer.

All tests run offline — no real API key, no network calls.
Gemini behaviour is tested via mocking.
"""

from __future__ import annotations

import json
import os
import unittest
from unittest.mock import MagicMock, patch

from news_agent.composer.compose import compose_article
from news_agent.composer.gemini_provider import (
    GeminiProvider,
    _build_user_prompt,
    _parse_gemini_response,
)
from news_agent.composer.mock_provider import MockProvider
from news_agent.composer.models import ComposedArticle, HistoricalExample, SimulationContext
from news_agent.composer.providers import Provider, get_provider
from news_agent.composer.template_provider import TemplateProvider, _fill, _build_historical_example
from news_agent.composer.validation import validate_article
from news_agent.core.models import HeadlineTemplate, RetrievalResult, HistoricalEvent


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ctx(**overrides) -> SimulationContext:
    """Build a minimal SimulationContext with sensible defaults."""
    defaults = dict(
        regime_name="recession",
        turn_number=3,
        news_type="major",
        category="banking_panic",
        region="us",
        severity=4,
        asset_returns={"equities": -5.0, "bonds": 1.2},
        catalyst="Bank reports massive losses",
    )
    defaults.update(overrides)
    return SimulationContext(**defaults)


def _template(**overrides) -> HeadlineTemplate:
    defaults = dict(
        template_id="test_tmpl_01",
        headline="Breaking: {{catalyst}} Shakes Markets",
        body="Markets reacted to {{catalyst}}. Equities fell {{equities_return}}.",
        beginner_explainer="Something bad happened in the economy and stock prices dropped significantly.",
    )
    defaults.update(overrides)
    return HeadlineTemplate(**defaults)


def _event(**overrides) -> HistoricalEvent:
    defaults = dict(
        event_id="test_event_001",
        news_type="major",
        category="banking_panic",
        title="Test Bank Collapse",
        historical_basis_source_ids=["nber_business_cycles"],
        date_label="2008-Q4",
        region="us",
        severity=5,
        short_summary="A major bank collapsed.",
        affected_asset_classes=["equities", "bonds"],
        directional_impact={"equities": "strongly_negative"},
        beginner_explanation="A big bank failed and markets crashed.",
        retrieval_tags=["banking", "crisis"],
        status="ready_for_curation",
    )
    defaults.update(overrides)
    return HistoricalEvent(**defaults)


def _retrieval_result(**kw) -> RetrievalResult:
    return RetrievalResult(
        event=_event(**{k: v for k, v in kw.items() if k in ("event_id", "title")}),
        score=70.0,
        match_reasons=["test"],
    )


def _valid_article(**overrides) -> ComposedArticle:
    """Build a minimal valid ComposedArticle."""
    defaults = dict(
        headline="Markets Drop Sharply on Banking Fears",
        short_bulletin="Global equity markets fell as fears of a banking crisis spread across major financial centers today.",
        beginner_explanation="Stock prices went down because people worried about banks failing.",
        historical_example=None,
        selected_event_ids=[],
        generation_mode="template_only",
        validation_flags=[],
        source="template",
    )
    defaults.update(overrides)
    return ComposedArticle(**defaults)


# ===========================================================================
# Provider interface
# ===========================================================================

class TestProviderFactory(unittest.TestCase):

    def test_template_only_mode(self):
        p = get_provider("template_only")
        self.assertIsInstance(p, TemplateProvider)

    def test_mock_mode(self):
        p = get_provider("mock")
        self.assertIsInstance(p, MockProvider)

    def test_invalid_mode_raises(self):
        with self.assertRaises(ValueError):
            get_provider("gpt4")

    @patch.dict(os.environ, {}, clear=False)
    def test_gemini_mode_falls_back_without_key(self):
        """If GEMINI_API_KEY is not set, gemini mode returns TemplateProvider."""
        os.environ.pop("GEMINI_API_KEY", None)
        p = get_provider("gemini")
        self.assertIsInstance(p, TemplateProvider)

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key-for-unit-test"})
    def test_gemini_mode_returns_gemini_with_key(self):
        p = get_provider("gemini")
        self.assertIsInstance(p, GeminiProvider)


# ===========================================================================
# Template provider
# ===========================================================================

class TestTemplateProvider(unittest.TestCase):

    def test_fills_placeholders(self):
        ctx = _ctx(catalyst="Lehman collapse")
        tmpl = _template()
        provider = TemplateProvider()
        article = provider.compose(ctx, [], tmpl)
        self.assertIn("Lehman collapse", article.headline)
        self.assertEqual(article.source, "template")
        self.assertEqual(article.generation_mode, "template_only")
        self.assertEqual(article.template_id, "test_tmpl_01")

    def test_unknown_placeholders_preserved(self):
        result = _fill("Price: {{unknown_var}}", {})
        self.assertEqual(result, "Price: {{unknown_var}}")

    def test_asset_returns_filled(self):
        ctx = _ctx()
        tmpl = _template()
        provider = TemplateProvider()
        article = provider.compose(ctx, [], tmpl)
        self.assertIn("-5.0%", article.short_bulletin)

    def test_historical_ref_from_retrieved(self):
        ctx = _ctx()
        tmpl = _template(headline="{{historical_ref}} echoed")
        rr = [_retrieval_result()]
        provider = TemplateProvider()
        article = provider.compose(ctx, rr, tmpl)
        self.assertIn("Test Bank Collapse", article.headline)
        self.assertEqual(article.historical_event_id, "test_event_001")

    def test_selected_event_ids_populated(self):
        rr = [_retrieval_result(), _retrieval_result(event_id="test_event_002")]
        provider = TemplateProvider()
        article = provider.compose(_ctx(), rr, _template())
        self.assertIn("test_event_001", article.selected_event_ids)
        self.assertEqual(len(article.selected_event_ids), 2)

    def test_historical_example_from_retrieved(self):
        rr = [_retrieval_result()]
        provider = TemplateProvider()
        article = provider.compose(_ctx(), rr, _template())
        self.assertIsNotNone(article.historical_example)
        he = article.historical_example
        self.assertEqual(he.title, "Test Bank Collapse")
        self.assertIn("test_event_001", he.source_event_ids)
        self.assertTrue(he.why_similar)
        self.assertTrue(he.what_happened)
        self.assertTrue(he.beginner_takeaway)

    def test_no_historical_example_without_retrieved(self):
        provider = TemplateProvider()
        article = provider.compose(_ctx(), [], _template())
        self.assertIsNone(article.historical_example)
        self.assertEqual(article.selected_event_ids, [])

    def test_deterministic_output(self):
        """Same inputs → identical outputs (deterministic)."""
        ctx = _ctx()
        rr = [_retrieval_result()]
        tmpl = _template()
        provider = TemplateProvider()
        a1 = provider.compose(ctx, rr, tmpl)
        a2 = provider.compose(ctx, rr, tmpl)
        self.assertEqual(a1.headline, a2.headline)
        self.assertEqual(a1.short_bulletin, a2.short_bulletin)
        self.assertEqual(a1.beginner_explanation, a2.beginner_explanation)
        self.assertEqual(a1.to_dict(), a2.to_dict())

    def test_to_dict_shape(self):
        rr = [_retrieval_result()]
        provider = TemplateProvider()
        article = provider.compose(_ctx(), rr, _template())
        d = article.to_dict()
        self.assertIn("headline", d)
        self.assertIn("short_bulletin", d)
        self.assertIn("beginner_explanation", d)
        self.assertIn("historical_example", d)
        self.assertIn("selected_event_ids", d)
        self.assertIn("generation_mode", d)
        self.assertIn("validation_flags", d)
        self.assertEqual(d["generation_mode"], "template_only")
        # historical_example sub-keys
        he = d["historical_example"]
        self.assertIn("title", he)
        self.assertIn("why_similar", he)
        self.assertIn("what_happened", he)
        self.assertIn("beginner_takeaway", he)
        self.assertIn("source_event_ids", he)


# ===========================================================================
# Historical example builder
# ===========================================================================

class TestHistoricalExampleBuilder(unittest.TestCase):

    def test_returns_none_without_retrieved(self):
        self.assertIsNone(_build_historical_example([], _ctx()))

    def test_builds_from_best_match(self):
        rr = [_retrieval_result()]
        he = _build_historical_example(rr, _ctx())
        self.assertIsNotNone(he)
        self.assertEqual(he.title, "Test Bank Collapse")
        self.assertEqual(he.what_happened, "A major bank collapsed.")
        self.assertEqual(he.beginner_takeaway, "A big bank failed and markets crashed.")
        self.assertIn("test_event_001", he.source_event_ids)

    def test_why_similar_includes_category(self):
        he = _build_historical_example([_retrieval_result()], _ctx())
        self.assertIn("banking panic", he.why_similar)

    def test_why_similar_includes_region(self):
        he = _build_historical_example([_retrieval_result()], _ctx(region="eu"))
        self.assertIn("EU", he.why_similar)


# ===========================================================================
# Mock provider
# ===========================================================================

class TestMockProvider(unittest.TestCase):

    def test_returns_mock_article(self):
        provider = MockProvider()
        article = provider.compose(_ctx(), [], _template())
        self.assertEqual(article.source, "mock")
        self.assertEqual(article.generation_mode, "mock")
        self.assertIn("[MOCK]", article.headline)

    def test_includes_event_id_when_retrieved(self):
        rr = [_retrieval_result()]
        provider = MockProvider()
        article = provider.compose(_ctx(), rr, _template())
        self.assertEqual(article.historical_event_id, "test_event_001")
        self.assertIsNotNone(article.historical_example)

    def test_no_historical_example_without_retrieved(self):
        provider = MockProvider()
        article = provider.compose(_ctx(), [], _template())
        self.assertIsNone(article.historical_example)
        self.assertEqual(article.selected_event_ids, [])


# ===========================================================================
# Gemini provider — no real API calls
# ===========================================================================

class TestGeminiProvider(unittest.TestCase):

    def test_is_available_false_without_key(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("GEMINI_API_KEY", None)
            p = GeminiProvider()
            self.assertFalse(p.is_available())

    def test_is_available_true_with_key(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}):
            p = GeminiProvider()
            self.assertTrue(p.is_available())

    def test_is_available_false_with_empty_key(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": "   "}):
            p = GeminiProvider()
            self.assertFalse(p.is_available())

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"})
    def test_compose_with_mocked_client(self):
        """Simulate a successful Gemini response."""
        p = GeminiProvider()
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "headline": "Bank Collapse Rocks Markets",
            "short_bulletin": "A major bank reported insolvency today, sending shockwaves through global markets. Equities dropped sharply while bonds rallied.",
            "beginner_explanation": "A big bank ran out of money and investors panicked, selling stocks quickly.",
        })
        mock_client.models.generate_content.return_value = mock_response
        p._client = mock_client

        article = p.compose(_ctx(), [_retrieval_result()], _template())
        self.assertEqual(article.source, "gemini")
        self.assertEqual(article.generation_mode, "gemini")
        self.assertEqual(article.headline, "Bank Collapse Rocks Markets")
        self.assertEqual(article.historical_event_id, "test_event_001")
        # historical_example is from retrieval, NOT from Gemini
        self.assertIsNotNone(article.historical_example)
        self.assertEqual(article.historical_example.title, "Test Bank Collapse")

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"})
    def test_compose_raises_on_bad_json(self):
        p = GeminiProvider()
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "This is not JSON"
        mock_client.models.generate_content.return_value = mock_response
        p._client = mock_client

        with self.assertRaises(RuntimeError):
            p.compose(_ctx(), [], _template())

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"})
    def test_compose_raises_on_api_failure(self):
        p = GeminiProvider()
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = Exception("API error")
        p._client = mock_client

        with self.assertRaises(RuntimeError):
            p.compose(_ctx(), [], _template())

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"})
    def test_gemini_selected_event_ids(self):
        """Gemini provider populates selected_event_ids from retrieval."""
        p = GeminiProvider()
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "headline": "Crisis Deepens Further",
            "short_bulletin": "Financial markets continued to fall as the crisis deepened. Safe haven assets rallied.",
            "beginner_explanation": "The money problems got worse and people moved their savings to safer places.",
        })
        mock_client.models.generate_content.return_value = mock_response
        p._client = mock_client

        rr = [_retrieval_result(), _retrieval_result(event_id="test_event_002")]
        article = p.compose(_ctx(), rr, _template())
        self.assertEqual(len(article.selected_event_ids), 2)
        self.assertIn("test_event_001", article.selected_event_ids)


# ===========================================================================
# Response parsing
# ===========================================================================

class TestParseGeminiResponse(unittest.TestCase):

    def test_valid_json(self):
        text = json.dumps({
            "headline": "Markets Crash",
            "short_bulletin": "Equities fell sharply as panic spread across global markets today.",
            "beginner_explanation": "Stock prices went down a lot because people were scared.",
        })
        result = _parse_gemini_response(text)
        self.assertIsNotNone(result)
        self.assertEqual(result["headline"], "Markets Crash")

    def test_json_with_code_fence(self):
        text = '```json\n{"headline":"H","short_bulletin":"B long enough for parse test yeah.","beginner_explanation":"E is also long enough here."}\n```'
        result = _parse_gemini_response(text)
        self.assertIsNotNone(result)
        self.assertEqual(result["headline"], "H")

    def test_missing_key_returns_none(self):
        text = json.dumps({"headline": "H", "short_bulletin": "B"})
        self.assertIsNone(_parse_gemini_response(text))

    def test_empty_value_returns_none(self):
        text = json.dumps({
            "headline": "",
            "short_bulletin": "B",
            "beginner_explanation": "E",
        })
        self.assertIsNone(_parse_gemini_response(text))

    def test_not_json_returns_none(self):
        self.assertIsNone(_parse_gemini_response("just some text"))

    def test_array_returns_none(self):
        self.assertIsNone(_parse_gemini_response('[1, 2, 3]'))

    def test_legacy_body_key_accepted(self):
        """Gemini might return 'body' instead of 'short_bulletin' — should still work."""
        text = json.dumps({
            "headline": "Markets Crash",
            "body": "Equities fell sharply as panic spread across global markets today.",
            "beginner_explanation": "Stock prices went down a lot because people were scared.",
        })
        result = _parse_gemini_response(text)
        self.assertIsNotNone(result)
        self.assertIn("short_bulletin", result)
        self.assertEqual(result["short_bulletin"], "Equities fell sharply as panic spread across global markets today.")


# ===========================================================================
# Prompt construction
# ===========================================================================

class TestPromptConstruction(unittest.TestCase):

    def test_prompt_includes_context(self):
        ctx = _ctx(catalyst="Oil shock")
        prompt = _build_user_prompt(ctx, [], _template())
        self.assertIn("Oil shock", prompt)
        self.assertIn("recession", prompt)
        self.assertIn("SIMULATION CONTEXT", prompt)

    def test_prompt_includes_retrieved_events(self):
        rr = [_retrieval_result()]
        prompt = _build_user_prompt(_ctx(), rr, _template())
        self.assertIn("Test Bank Collapse", prompt)
        self.assertIn("HISTORICAL EXAMPLES", prompt)

    def test_prompt_includes_template_reference(self):
        prompt = _build_user_prompt(_ctx(), [], _template())
        self.assertIn("TEMPLATE REFERENCE", prompt)
        self.assertIn("Breaking:", prompt)

    def test_prompt_includes_extended_fields(self):
        ctx = _ctx(
            scenario_id="scn_42",
            directional_impact={"equities": "negative"},
            benchmark_move=-3.5,
            educational_tags=["systemic_risk", "contagion"],
        )
        prompt = _build_user_prompt(ctx, [], _template())
        self.assertIn("scn_42", prompt)
        self.assertIn("equities: negative", prompt)
        self.assertIn("-3.5%", prompt)
        self.assertIn("systemic_risk", prompt)

    def test_prompt_asks_for_short_bulletin(self):
        prompt = _build_user_prompt(_ctx(), [], _template())
        self.assertIn("short_bulletin", prompt)

    def test_prompt_prohibitions(self):
        """System prompt must include explicit prohibitions."""
        from news_agent.composer.gemini_provider import _SYSTEM_PROMPT
        self.assertIn("Do NOT invent numbers", _SYSTEM_PROMPT)
        self.assertIn("Do NOT invent named institutions", _SYSTEM_PROMPT)
        self.assertIn("Do NOT invent exact real-world dates", _SYSTEM_PROMPT)
        self.assertIn("Do NOT contradict", _SYSTEM_PROMPT)


# ===========================================================================
# Validation
# ===========================================================================

class TestValidation(unittest.TestCase):

    def test_valid_article_passes(self):
        article = _valid_article()
        result = validate_article(article)
        self.assertTrue(result.valid, result.errors)

    def test_empty_headline_fails(self):
        article = _valid_article(headline="")
        result = validate_article(article)
        self.assertFalse(result.valid)
        self.assertTrue(any("headline" in e for e in result.errors))

    def test_empty_short_bulletin_fails(self):
        article = _valid_article(short_bulletin="")
        result = validate_article(article)
        self.assertFalse(result.valid)
        self.assertTrue(any("short_bulletin" in e for e in result.errors))

    def test_short_bulletin_too_short_fails(self):
        article = _valid_article(short_bulletin="Short.")
        result = validate_article(article)
        self.assertFalse(result.valid)
        self.assertTrue(any("short_bulletin too short" in e for e in result.errors))

    def test_unknown_source_fails(self):
        article = _valid_article(source="unknown_provider")
        result = validate_article(article)
        self.assertFalse(result.valid)
        self.assertTrue(any("source" in e for e in result.errors))

    def test_unknown_generation_mode_fails(self):
        article = _valid_article(generation_mode="gpt4")
        result = validate_article(article)
        self.assertFalse(result.valid)
        self.assertTrue(any("generation_mode" in e for e in result.errors))

    def test_valid_article_with_historical_example(self):
        he = HistoricalExample(
            title="Test",
            why_similar="Category match",
            what_happened="A thing happened",
            beginner_takeaway="Simple explanation",
            source_event_ids=["evt_001"],
        )
        article = _valid_article(historical_example=he)
        result = validate_article(article)
        self.assertTrue(result.valid, result.errors)

    def test_historical_example_empty_title_fails(self):
        he = HistoricalExample(
            title="",
            why_similar="Category match",
            what_happened="A thing happened",
            beginner_takeaway="Simple explanation",
            source_event_ids=["evt_001"],
        )
        article = _valid_article(historical_example=he)
        result = validate_article(article)
        self.assertFalse(result.valid)
        self.assertTrue(any("historical_example.title" in e for e in result.errors))

    def test_historical_example_empty_source_ids_fails(self):
        he = HistoricalExample(
            title="Test",
            why_similar="Category match",
            what_happened="A thing happened",
            beginner_takeaway="Simple explanation",
            source_event_ids=[],
        )
        article = _valid_article(historical_example=he)
        result = validate_article(article)
        self.assertFalse(result.valid)
        self.assertTrue(any("source_event_ids" in e for e in result.errors))


# ===========================================================================
# End-to-end compose_article
# ===========================================================================

class TestComposeArticle(unittest.TestCase):

    def test_template_only_returns_valid_article(self):
        ctx = _ctx()
        article = compose_article(ctx, mode="template_only")
        self.assertEqual(article.source, "template")
        self.assertEqual(article.generation_mode, "template_only")
        self.assertTrue(article.headline)
        self.assertTrue(article.short_bulletin)
        result = validate_article(article)
        self.assertTrue(result.valid, result.errors)

    def test_template_only_has_historical_example(self):
        """Template mode should produce historical_example when events exist."""
        ctx = _ctx()
        article = compose_article(ctx, mode="template_only")
        # The curated dataset has banking_panic events, so retrieval should match
        self.assertIsNotNone(article.historical_example)
        self.assertTrue(article.selected_event_ids)

    def test_mock_mode_returns_mock_article(self):
        ctx = _ctx()
        article = compose_article(ctx, mode="mock")
        self.assertEqual(article.source, "mock")
        self.assertEqual(article.generation_mode, "mock")
        self.assertIn("[MOCK]", article.headline)

    def test_gemini_falls_back_without_key(self):
        """Without GEMINI_API_KEY, gemini mode silently falls back to template."""
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("GEMINI_API_KEY", None)
            article = compose_article(_ctx(), mode="gemini")
            self.assertEqual(article.source, "template")
            self.assertEqual(article.generation_mode, "template_only")

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"})
    def test_gemini_fallback_on_api_error(self):
        """If Gemini raises, compose_article falls back to template."""
        with patch("news_agent.composer.gemini_provider.GeminiProvider._get_client") as mock_gc:
            mock_client = MagicMock()
            mock_client.models.generate_content.side_effect = Exception("network error")
            mock_gc.return_value = mock_client
            article = compose_article(_ctx(), mode="gemini")
            self.assertEqual(article.source, "template")
            self.assertEqual(article.generation_mode, "template_only")
            self.assertTrue(any("fallback" in f for f in article.validation_flags))

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"})
    def test_gemini_fallback_on_invalid_output(self):
        """If Gemini returns invalid JSON, compose_article falls back to template."""
        with patch("news_agent.composer.gemini_provider.GeminiProvider._get_client") as mock_gc:
            mock_client = MagicMock()
            mock_response = MagicMock()
            mock_response.text = "not json at all"
            mock_client.models.generate_content.return_value = mock_response
            mock_gc.return_value = mock_client
            article = compose_article(_ctx(), mode="gemini")
            self.assertEqual(article.source, "template")

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"})
    def test_gemini_success_path(self):
        """Successful Gemini response is returned as-is."""
        good_response = json.dumps({
            "headline": "Banking Crisis Deepens as Losses Mount",
            "short_bulletin": "A major bank reported massive losses today, triggering widespread selling across equity markets. Bond markets rallied as investors sought safety.",
            "beginner_explanation": "A big bank lost a lot of money, so people got scared and sold their stocks.",
        })
        with patch("news_agent.composer.gemini_provider.GeminiProvider._get_client") as mock_gc:
            mock_client = MagicMock()
            mock_response = MagicMock()
            mock_response.text = good_response
            mock_client.models.generate_content.return_value = mock_response
            mock_gc.return_value = mock_client
            article = compose_article(_ctx(), mode="gemini")
            self.assertEqual(article.source, "gemini")
            self.assertEqual(article.generation_mode, "gemini")
            self.assertEqual(article.headline, "Banking Crisis Deepens as Losses Mount")
            # historical_example comes from retrieval, not Gemini
            self.assertIsNotNone(article.historical_example)

    def test_to_dict_contract_shape(self):
        """Verify the to_dict output matches the exact contract shape."""
        ctx = _ctx()
        article = compose_article(ctx, mode="template_only")
        d = article.to_dict()
        required_keys = {"headline", "short_bulletin", "beginner_explanation",
                         "historical_example", "selected_event_ids",
                         "generation_mode", "validation_flags"}
        self.assertEqual(set(d.keys()), required_keys)
        self.assertIsInstance(d["validation_flags"], list)
        self.assertIsInstance(d["selected_event_ids"], list)

    def test_template_only_is_deterministic(self):
        """Two calls with same context produce identical output."""
        ctx = _ctx()
        a1 = compose_article(ctx, mode="template_only")
        a2 = compose_article(ctx, mode="template_only")
        self.assertEqual(a1.to_dict(), a2.to_dict())


# ===========================================================================
# SimulationContext extended fields
# ===========================================================================

class TestSimulationContextExtended(unittest.TestCase):

    def test_extended_fields_default_none(self):
        ctx = _ctx()
        self.assertIsNone(ctx.scenario_id)
        self.assertIsNone(ctx.turn_id)
        self.assertIsNone(ctx.directional_impact)
        self.assertIsNone(ctx.benchmark_move)
        self.assertIsNone(ctx.educational_tags)

    def test_extended_fields_populated(self):
        ctx = _ctx(
            scenario_id="scn_1",
            turn_id="t_5",
            directional_impact={"equities": "negative"},
            benchmark_move=-2.5,
            educational_tags=["diversification"],
        )
        self.assertEqual(ctx.scenario_id, "scn_1")
        self.assertEqual(ctx.turn_id, "t_5")
        self.assertEqual(ctx.directional_impact, {"equities": "negative"})
        self.assertEqual(ctx.benchmark_move, -2.5)
        self.assertEqual(ctx.educational_tags, ["diversification"])


if __name__ == "__main__":
    unittest.main()
