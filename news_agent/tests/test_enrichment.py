"""
Tests for the news_agent enrichment pipeline.

Covers:
- Individual rule functions with synthetic inputs
- Full build pipeline determinism
- Taxonomy compliance of enriched records
- Structural validity of enriched events
- Loader/retrieval integration with enriched dataset
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from news_agent.enrichment.rules import (
    bls_inflation_events,
    ecb_policy_events,
    eia_oil_spike_events,
    fed_policy_events,
    nber_recession_events,
    nyfed_crisis_events,
)
from news_agent.enrichment.build_historical_events import build, _load_normalized


# ---------------------------------------------------------------------------
# Taxonomy reference (loaded once)
# ---------------------------------------------------------------------------

_CURATED = Path(__file__).resolve().parent.parent / "datasets" / "curated"
_TAXONOMY = json.loads((_CURATED / "event_taxonomy.json").read_text(encoding="utf-8"))
_VALID_NEWS_TYPES = set(_TAXONOMY["news_types"].keys())
_VALID_CATEGORIES: dict[str, set[str]] = {
    nt: set(obj["categories"].keys())
    for nt, obj in _TAXONOMY["news_types"].items()
}

_REQUIRED_FIELDS = {
    "event_id", "source_type", "source_refs", "news_type", "category",
    "title", "date_label", "region", "severity", "short_summary",
    "affected_asset_classes", "directional_impact", "beginner_explanation",
    "retrieval_tags", "confidence", "derivation_method", "status",
}


# ---------------------------------------------------------------------------
# Rule-level tests with synthetic data
# ---------------------------------------------------------------------------

class TestNBERRules(unittest.TestCase):
    def test_filters_pre_1900(self):
        records = [
            {"peak_date": "1857-06", "trough_date": "1858-12",
             "contraction_months": 18, "peak_text": "June 1857", "trough_text": "Dec 1858"},
            {"peak_date": "1929-08", "trough_date": "1933-03",
             "contraction_months": 43, "peak_text": "Aug 1929", "trough_text": "Mar 1933"},
        ]
        events = nber_recession_events(records)
        # Only the 1929 cycle should pass (post-1900)
        self.assertEqual(len(events), 1)
        self.assertIn("1929", events[0]["title"])

    def test_severity_scales_with_duration(self):
        # Short (6 months) vs long (20 months)
        records = [
            {"peak_date": "2001-03", "trough_date": "2001-11",
             "contraction_months": 6, "peak_text": "Mar 2001", "trough_text": "Nov 2001"},
            {"peak_date": "2007-12", "trough_date": "2009-06",
             "contraction_months": 18, "peak_text": "Dec 2007", "trough_text": "Jun 2009"},
        ]
        events = nber_recession_events(records)
        self.assertEqual(events[0]["severity"], 2)  # 6 months → 2
        self.assertEqual(events[1]["severity"], 5)  # 18 months → 5

    def test_skips_missing_peak(self):
        records = [
            {"peak_date": None, "trough_date": "1854-12",
             "contraction_months": None, "peak_text": None, "trough_text": "Dec 1854"},
        ]
        events = nber_recession_events(records)
        self.assertEqual(len(events), 0)


class TestEIARules(unittest.TestCase):
    def test_empty_below_60_records(self):
        records = [{"date": "2020-01-01", "price_usd": 50.0}] * 30
        self.assertEqual(eia_oil_spike_events(records), [])

    def test_detects_large_spike(self):
        # Build 61 records: price starts at 50, jumps to 100 at the end
        records = [{"date": f"2020-01-{i+1:02d}", "price_usd": 50.0} for i in range(60)]
        records.append({"date": "2020-03-25", "price_usd": 100.0})
        events = eia_oil_spike_events(records)
        self.assertGreater(len(events), 0)
        self.assertEqual(events[0]["category"], "oil_price_spike")

    def test_no_spike_on_flat_prices(self):
        records = [{"date": f"2020-{(i//22)+1:02d}-{(i%22)+1:02d}",
                     "price_usd": 60.0} for i in range(100)]
        events = eia_oil_spike_events(records)
        self.assertEqual(len(events), 0)


class TestBLSRules(unittest.TestCase):
    def test_flags_high_mom(self):
        records = [
            {"date": "2022-01", "cpi_index": 280, "mom_pct": 0.5, "yoy_pct": None},
            {"date": "2022-03", "cpi_index": 287, "mom_pct": 1.34, "yoy_pct": None},
        ]
        events = bls_inflation_events(records)
        self.assertEqual(len(events), 1)
        self.assertIn("1.34%", events[0]["title"])

    def test_ignores_low_mom(self):
        records = [
            {"date": "2022-09", "cpi_index": 296, "mom_pct": 0.22, "yoy_pct": None},
        ]
        self.assertEqual(bls_inflation_events(records), [])


class TestFedRules(unittest.TestCase):
    def test_picks_fomc_statements_only(self):
        records = [
            {"date": "2026-03-18", "title": "Federal Reserve issues FOMC statement",
             "description": "", "category": "", "link": ""},
            {"date": "2026-02-18", "title": "Minutes of the FOMC January meeting",
             "description": "", "category": "", "link": ""},
        ]
        events = fed_policy_events(records)
        self.assertEqual(len(events), 1)
        self.assertIn("2026-03-18", events[0]["source_refs"][0])


class TestNYFedRules(unittest.TestCase):
    def test_all_milestones_promoted(self):
        records = [
            {"date": "2008-09-15", "title": "Lehman Brothers files for bankruptcy",
             "significance": "Largest bankruptcy"},
        ]
        events = nyfed_crisis_events(records)
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["category"], "banking_panic")

    def test_default_category(self):
        records = [
            {"date": "2009-01-01", "title": "Unknown crisis event",
             "significance": "Something happened"},
        ]
        events = nyfed_crisis_events(records)
        self.assertEqual(events[0]["category"], "global_crash")


class TestECBRules(unittest.TestCase):
    def test_skips_operational_items(self):
        records = [
            {"date": "2026-03-19", "title": "T2S is operating normally", "link": ""},
            {"date": "2026-03-18", "title": "Euro foreign exchange reference rates", "link": ""},
            {"date": "2026-03-18", "title": "EURO-SHORT-TERM-RATE PUBLICATION MESSAGE", "link": ""},
        ]
        events = ecb_policy_events(records)
        self.assertEqual(len(events), 0)

    def test_matches_policy_decision(self):
        records = [
            {"date": "2023-07-27", "title": "ECB interest rate decision: +25bps", "link": ""},
        ]
        events = ecb_policy_events(records)
        self.assertEqual(len(events), 1)


# ---------------------------------------------------------------------------
# Full pipeline tests
# ---------------------------------------------------------------------------

class TestBuildPipeline(unittest.TestCase):
    def test_build_returns_events(self):
        events = build()
        self.assertGreater(len(events), 0)

    def test_deterministic(self):
        """Running build() twice produces identical output."""
        run1 = build()
        run2 = build()
        ids1 = [e["event_id"] for e in run1]
        ids2 = [e["event_id"] for e in run2]
        self.assertEqual(ids1, ids2)

    def test_sorted_by_event_id(self):
        events = build()
        ids = [e["event_id"] for e in events]
        self.assertEqual(ids, sorted(ids))


# ---------------------------------------------------------------------------
# Structural validity
# ---------------------------------------------------------------------------

class TestEnrichedStructure(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.events = build()

    def test_all_required_fields_present(self):
        for e in self.events:
            missing = _REQUIRED_FIELDS - set(e.keys())
            self.assertEqual(missing, set(), f"{e['event_id']} missing {missing}")

    def test_news_types_valid(self):
        for e in self.events:
            self.assertIn(
                e["news_type"], _VALID_NEWS_TYPES,
                f"{e['event_id']} has invalid news_type={e['news_type']}"
            )

    def test_categories_valid_for_news_type(self):
        for e in self.events:
            nt = e["news_type"]
            cat = e["category"]
            self.assertIn(
                cat, _VALID_CATEGORIES[nt],
                f"{e['event_id']}: category '{cat}' not in {nt} taxonomy"
            )

    def test_severity_in_range(self):
        for e in self.events:
            self.assertIn(e["severity"], range(1, 6))

    def test_confidence_values(self):
        valid = {"high", "medium", "low"}
        for e in self.events:
            self.assertIn(e["confidence"], valid)

    def test_status_is_auto_enriched(self):
        for e in self.events:
            self.assertEqual(e["status"], "auto_enriched")

    def test_event_ids_unique(self):
        ids = [e["event_id"] for e in self.events]
        self.assertEqual(len(ids), len(set(ids)))


# ---------------------------------------------------------------------------
# Loader / retrieval integration
# ---------------------------------------------------------------------------

class TestLoaderIntegration(unittest.TestCase):
    def test_load_enriched_events(self):
        from news_agent.core.loader import load_enriched_events
        events = load_enriched_events()
        self.assertGreater(len(events), 0)
        # Check first event has expected type
        self.assertTrue(events[0].event_id.startswith("enriched_"))

    def test_load_events_combined(self):
        from news_agent.core.loader import load_events, load_events_combined
        original = load_events()
        combined = load_events_combined()
        self.assertGreater(len(combined), len(original))

    def test_retrieval_with_enriched(self):
        from news_agent.core.loader import load_events_combined
        from news_agent.core.retrieval import retrieve
        from news_agent.core.models import RetrievalQuery

        events = load_events_combined()
        q = RetrievalQuery(news_type="impactful", category="oil_price_spike", top_k=3)
        results = retrieve(events, q)
        self.assertGreater(len(results), 0)
        self.assertGreater(results[0].score, 0)


if __name__ == "__main__":
    unittest.main()
