"""Tests for news_agent.core.loader — curated dataset loading & validation."""

import json
import tempfile
from pathlib import Path

import pytest

from news_agent.core.loader import (
    DatasetLoadError,
    _CURATED_DIR,
    load_events,
    load_manifest,
    load_taxonomy,
    load_templates,
    load_all,
)
from news_agent.core.models import (
    HeadlineTemplate,
    HistoricalEvent,
    NewsTypeDef,
    SourceEntry,
)


# ---------------------------------------------------------------------------
# Happy path: curated files load correctly
# ---------------------------------------------------------------------------

class TestLoadManifest:
    def test_loads_successfully(self):
        entries = load_manifest()
        assert isinstance(entries, list)
        assert len(entries) >= 1
        assert all(isinstance(e, SourceEntry) for e in entries)

    def test_all_entries_have_source_id(self):
        for e in load_manifest():
            assert e.source_id, f"Empty source_id in manifest entry: {e}"


class TestLoadTaxonomy:
    def test_loads_successfully(self):
        tax = load_taxonomy()
        assert isinstance(tax, dict)
        assert "major" in tax
        assert "impactful" in tax
        assert "ordinary" in tax

    def test_categories_exist(self):
        tax = load_taxonomy()
        assert "banking_panic" in tax["major"].categories
        assert "inflation_surprise" in tax["impactful"].categories
        assert "market_chatter" in tax["ordinary"].categories

    def test_types_are_correct(self):
        tax = load_taxonomy()
        for nt in tax.values():
            assert isinstance(nt, NewsTypeDef)
            assert nt.description
            for cat in nt.categories.values():
                assert cat.description


class TestLoadEvents:
    def test_loads_successfully(self):
        events = load_events()
        assert isinstance(events, list)
        assert len(events) >= 8  # we seeded 12

    def test_all_events_have_required_fields(self):
        for e in load_events():
            assert isinstance(e, HistoricalEvent)
            assert e.event_id
            assert e.news_type in ("major", "impactful", "ordinary")
            assert e.severity >= 1

    def test_contains_major_and_impactful(self):
        events = load_events()
        types = {e.news_type for e in events}
        assert "major" in types
        assert "impactful" in types


class TestLoadTemplates:
    def test_loads_successfully(self):
        tmpl = load_templates()
        assert isinstance(tmpl, dict)
        assert "major" in tmpl
        assert "impactful" in tmpl
        assert "ordinary" in tmpl

    def test_templates_are_typed(self):
        tmpl = load_templates()
        for nt, cats in tmpl.items():
            for cat, tlist in cats.items():
                assert isinstance(tlist, list)
                for t in tlist:
                    assert isinstance(t, HeadlineTemplate)
                    assert t.template_id


class TestLoadAll:
    def test_returns_four_datasets(self):
        manifest, taxonomy, events, templates = load_all()
        assert len(manifest) >= 1
        assert "major" in taxonomy
        assert len(events) >= 8
        assert "major" in templates


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------

class TestMissingFile:
    def test_missing_manifest_raises(self, tmp_path, monkeypatch):
        """Point _CURATED_DIR to an empty dir — should raise DatasetLoadError."""
        import news_agent.core.loader as loader_mod
        fake_files = dict(loader_mod._FILES)
        fake_files["manifest"] = tmp_path / "nonexistent.json"
        monkeypatch.setattr(loader_mod, "_FILES", fake_files)
        with pytest.raises(DatasetLoadError, match="Missing curated file"):
            load_manifest()


class TestInvalidJson:
    def test_malformed_json_raises(self, tmp_path, monkeypatch):
        bad_file = tmp_path / "bad.json"
        bad_file.write_text("NOT JSON {{{", encoding="utf-8")
        import news_agent.core.loader as loader_mod
        fake_files = dict(loader_mod._FILES)
        fake_files["manifest"] = bad_file
        monkeypatch.setattr(loader_mod, "_FILES", fake_files)
        with pytest.raises(DatasetLoadError, match="Invalid JSON"):
            load_manifest()


class TestMissingKeys:
    def test_manifest_missing_keys_raises(self, tmp_path, monkeypatch):
        bad_file = tmp_path / "manifest.json"
        bad_file.write_text(json.dumps([{"source_id": "x"}]), encoding="utf-8")
        import news_agent.core.loader as loader_mod
        fake_files = dict(loader_mod._FILES)
        fake_files["manifest"] = bad_file
        monkeypatch.setattr(loader_mod, "_FILES", fake_files)
        with pytest.raises(DatasetLoadError, match="missing required keys"):
            load_manifest()
