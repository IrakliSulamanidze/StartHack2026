"""Tests for news_agent.core.retrieval and news_agent.core.templates."""

import pytest

from news_agent.core.loader import load_events, load_templates
from news_agent.core.models import RetrievalQuery
from news_agent.core.retrieval import retrieve
from news_agent.core.templates import lookup, lookup_one, list_available, _FALLBACK


# ---------------------------------------------------------------------------
# Retrieval tests
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def events():
    return load_events()


class TestRetrieval:
    def test_top_result_matches_query(self, events):
        q = RetrievalQuery(news_type="major", category="banking_panic", top_k=3)
        results = retrieve(events, q)
        assert len(results) >= 1
        top = results[0]
        assert top.event.news_type == "major"
        assert top.event.category == "banking_panic"
        assert top.score > 0

    def test_returns_deterministic_order(self, events):
        q = RetrievalQuery(news_type="major", category="global_crash", top_k=5)
        r1 = retrieve(events, q)
        r2 = retrieve(events, q)
        assert [r.event.event_id for r in r1] == [r.event.event_id for r in r2]

    def test_top_k_limits_results(self, events):
        q = RetrievalQuery(news_type="major", category="global_crash", top_k=1)
        results = retrieve(events, q)
        assert len(results) == 1

    def test_region_filter_boosts_score(self, events):
        q_any = RetrievalQuery(news_type="impactful", category="inflation_surprise", top_k=3)
        q_us = RetrievalQuery(news_type="impactful", category="inflation_surprise", region="us", top_k=3)
        r_any = retrieve(events, q_any)
        r_us = retrieve(events, q_us)
        # US-filtered should score at least as high for the top match
        if r_any and r_us:
            assert r_us[0].score >= r_any[0].score

    def test_severity_proximity_scoring(self, events):
        q5 = RetrievalQuery(news_type="major", category="banking_panic", severity=5, top_k=3)
        q1 = RetrievalQuery(news_type="major", category="banking_panic", severity=1, top_k=3)
        r5 = retrieve(events, q5)
        r1 = retrieve(events, q1)
        # banking_panic events have severity 5 → severity=5 query should get higher score
        if r5 and r1:
            assert r5[0].score >= r1[0].score

    def test_asset_class_overlap(self, events):
        q = RetrievalQuery(
            news_type="impactful",
            category="oil_price_spike",
            affected_asset_classes=["equities", "gold"],
            top_k=3,
        )
        results = retrieve(events, q)
        assert len(results) >= 1
        # Top match should mention asset overlap in reasons
        assert any("asset_overlap" in r for r in results[0].match_reasons)

    def test_category_filter_works(self, events):
        q = RetrievalQuery(news_type="impactful", category="dovish_rate_cut", top_k=3)
        results = retrieve(events, q)
        assert len(results) >= 1
        # Top result should be a dovish_rate_cut
        assert results[0].event.category == "dovish_rate_cut"

    def test_empty_events_returns_empty(self):
        q = RetrievalQuery(news_type="major", category="banking_panic", top_k=3)
        results = retrieve([], q)
        assert results == []

    def test_tags_boost_score(self, events):
        q_no_tags = RetrievalQuery(news_type="major", category="banking_panic", top_k=1)
        q_tags = RetrievalQuery(
            news_type="major", category="banking_panic",
            tags=["lehman", "2008"], top_k=1,
        )
        r_no = retrieve(events, q_no_tags)
        r_tags = retrieve(events, q_tags)
        if r_no and r_tags:
            assert r_tags[0].score >= r_no[0].score


# ---------------------------------------------------------------------------
# Template tests
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def templates():
    return load_templates()


class TestTemplates:
    def test_exact_lookup(self, templates):
        result = lookup(templates, "major", "global_crash")
        assert len(result) >= 1
        assert result[0].template_id.startswith("major_crash")

    def test_fallback_on_unknown_category(self, templates):
        result = lookup(templates, "major", "nonexistent_category_xyz")
        assert len(result) >= 1
        # Should return *some* template (either same-news-type fallback or generic)

    def test_fallback_on_unknown_type(self, templates):
        result = lookup(templates, "totally_unknown", "whatever")
        assert len(result) == 1
        assert result[0].template_id == "_fallback"

    def test_lookup_one(self, templates):
        t = lookup_one(templates, "impactful", "hawkish_rate_hike")
        assert t.headline
        assert t.body

    def test_lookup_one_wraps_index(self, templates):
        t0 = lookup_one(templates, "impactful", "hawkish_rate_hike", index=0)
        t_big = lookup_one(templates, "impactful", "hawkish_rate_hike", index=100)
        # Should wrap around, not crash
        assert t_big.template_id

    def test_list_available(self, templates):
        avail = list_available(templates)
        assert "major" in avail
        assert "impactful" in avail
        assert "ordinary" in avail
        assert "global_crash" in avail["major"]
