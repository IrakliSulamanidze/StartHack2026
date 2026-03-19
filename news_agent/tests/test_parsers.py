"""
Tests for the news_agent raw-source normalization parsers.

These tests run the actual parsers against the real raw files on disk.
They verify structure, types, and basic sanity of the output — not exact
values (which change with each data download).
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from news_agent.parsers.common import norm_path, raw_path

# ---------------------------------------------------------------------------
# NBER
# ---------------------------------------------------------------------------


class TestNBERParser(unittest.TestCase):
    def test_parse_returns_records(self):
        from news_agent.parsers.normalize_nber import parse

        records = parse()
        self.assertGreater(len(records), 30)  # ~35 cycles historically

    def test_record_structure(self):
        from news_agent.parsers.normalize_nber import parse

        rec = parse()[-1]  # latest cycle
        self.assertIn("peak_date", rec)
        self.assertIn("trough_date", rec)
        self.assertIn("contraction_months", rec)
        self.assertIsNotNone(rec["trough_date"])

    def test_dates_are_yyyy_mm(self):
        from news_agent.parsers.normalize_nber import parse

        for rec in parse():
            if rec["peak_date"]:
                self.assertRegex(rec["peak_date"], r"^\d{4}-\d{2}$")
            self.assertRegex(rec["trough_date"], r"^\d{4}-\d{2}$")


# ---------------------------------------------------------------------------
# EIA Oil Prices
# ---------------------------------------------------------------------------


class TestEIAParser(unittest.TestCase):
    def test_parse_returns_records(self):
        from news_agent.parsers.parse_eia_oil import parse

        records = parse()
        self.assertGreater(len(records), 5000)  # decades of daily data

    def test_record_structure(self):
        from news_agent.parsers.parse_eia_oil import parse

        rec = parse()[0]
        self.assertIn("date", rec)
        self.assertIn("price_usd", rec)
        self.assertIsInstance(rec["price_usd"], float)

    def test_dates_are_iso(self):
        from news_agent.parsers.parse_eia_oil import parse

        rec = parse()[0]
        self.assertRegex(rec["date"], r"^\d{4}-\d{2}-\d{2}$")

    def test_prices_are_positive(self):
        from news_agent.parsers.parse_eia_oil import parse

        for rec in parse()[:100]:
            self.assertGreater(rec["price_usd"], 0)


# ---------------------------------------------------------------------------
# Fed XML
# ---------------------------------------------------------------------------


class TestFedParser(unittest.TestCase):
    def test_parse_returns_records(self):
        from news_agent.parsers.parse_fed_xml import parse

        records = parse()
        self.assertGreater(len(records), 0)

    def test_record_structure(self):
        from news_agent.parsers.parse_fed_xml import parse

        rec = parse()[0]
        for key in ("date", "title", "description", "category", "link"):
            self.assertIn(key, rec)

    def test_dates_are_iso(self):
        from news_agent.parsers.parse_fed_xml import parse

        for rec in parse():
            self.assertRegex(rec["date"], r"^\d{4}-\d{2}-\d{2}$")

    def test_sorted_newest_first(self):
        from news_agent.parsers.parse_fed_xml import parse

        records = parse()
        dates = [r["date"] for r in records]
        self.assertEqual(dates, sorted(dates, reverse=True))


# ---------------------------------------------------------------------------
# ECB XML
# ---------------------------------------------------------------------------


class TestECBParser(unittest.TestCase):
    def test_parse_returns_records(self):
        from news_agent.parsers.parse_ecb_xml import parse

        records = parse()
        self.assertGreater(len(records), 0)

    def test_record_structure(self):
        from news_agent.parsers.parse_ecb_xml import parse

        rec = parse()[0]
        for key in ("date", "title", "link"):
            self.assertIn(key, rec)

    def test_dates_are_iso(self):
        from news_agent.parsers.parse_ecb_xml import parse

        for rec in parse():
            self.assertRegex(rec["date"], r"^\d{4}-\d{2}-\d{2}$")


# ---------------------------------------------------------------------------
# BLS CPI
# ---------------------------------------------------------------------------


class TestBLSParser(unittest.TestCase):
    def test_parse_returns_records(self):
        from news_agent.parsers.parse_bls_cpi import parse

        records = parse()
        self.assertEqual(len(records), 12)  # 12 months in 2022

    def test_record_structure(self):
        from news_agent.parsers.parse_bls_cpi import parse

        rec = parse()[0]
        for key in ("date", "cpi_index", "mom_pct", "yoy_pct"):
            self.assertIn(key, rec)

    def test_cpi_values_are_plausible(self):
        from news_agent.parsers.parse_bls_cpi import parse

        for rec in parse():
            self.assertGreater(rec["cpi_index"], 200)  # CPI-U > 200 in 2022
            self.assertLess(rec["cpi_index"], 400)

    def test_mom_computed_for_later_months(self):
        from news_agent.parsers.parse_bls_cpi import parse

        records = parse()
        # Second month should have MoM (first month may not)
        self.assertIsNotNone(records[1]["mom_pct"])


# ---------------------------------------------------------------------------
# NYFed PDF (placeholder)
# ---------------------------------------------------------------------------


class TestNYFedParser(unittest.TestCase):
    def test_pdf_exists(self):
        self.assertTrue(raw_path("major", "nyfed_crisis_timeline.pdf").exists())

    def test_parse_returns_milestones(self):
        from news_agent.parsers.extract_nyfed_pdf import parse

        records = parse()
        self.assertEqual(len(records), 10)

    def test_milestones_have_required_keys(self):
        from news_agent.parsers.extract_nyfed_pdf import parse

        for rec in parse():
            self.assertIn("date", rec)
            self.assertIn("title", rec)
            self.assertIn("significance", rec)

    def test_dates_are_iso(self):
        from news_agent.parsers.extract_nyfed_pdf import parse

        for rec in parse():
            self.assertRegex(rec["date"], r"^\d{4}-\d{2}-\d{2}$")


# ---------------------------------------------------------------------------
# write_normalized output
# ---------------------------------------------------------------------------


class TestWriteNormalized(unittest.TestCase):
    def test_output_files_are_valid_json(self):
        """After running normalize_all, all output files should be valid JSON."""
        norm_dir = norm_path("").parent  # normalized/ directory
        if not norm_dir.exists():
            self.skipTest("normalized/ not yet generated")
        for f in norm_dir.glob("*.json"):
            with open(f, encoding="utf-8") as fh:
                data = json.load(fh)
            self.assertIn("source_id", data)
            self.assertIn("record_count", data)
            self.assertIn("records", data)
            self.assertEqual(len(data["records"]), data["record_count"])


if __name__ == "__main__":
    unittest.main()
