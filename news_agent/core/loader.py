"""
Loader for curated news-agent JSON datasets.

Resolves paths relative to the datasets/curated/ directory within this
package so it works regardless of the caller's working directory.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List

from .models import (
    CategoryDef,
    HeadlineTemplate,
    HistoricalEvent,
    NewsTypeDef,
    SourceEntry,
)

# ---------------------------------------------------------------------------
# Path resolution
# ---------------------------------------------------------------------------

_CURATED_DIR = Path(__file__).resolve().parent.parent / "datasets" / "curated"

_FILES = {
    "manifest": _CURATED_DIR / "source_manifest.json",
    "taxonomy": _CURATED_DIR / "event_taxonomy.json",
    "events": _CURATED_DIR / "historical_events.json",
    "templates": _CURATED_DIR / "headline_templates.json",
}


class DatasetLoadError(Exception):
    """Raised when a curated file is missing, malformed, or invalid."""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _read_json(key: str) -> object:
    """Load and parse a curated JSON file by logical key."""
    path = _FILES[key]
    if not path.exists():
        raise DatasetLoadError(f"Missing curated file: {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise DatasetLoadError(f"Invalid JSON in {path.name}: {exc}") from exc


def _require_keys(obj: dict, keys: List[str], context: str) -> None:
    """Raise if any required key is absent from *obj*."""
    missing = [k for k in keys if k not in obj]
    if missing:
        raise DatasetLoadError(
            f"{context}: missing required keys {missing}"
        )


# ---------------------------------------------------------------------------
# Public loaders
# ---------------------------------------------------------------------------

_SOURCE_REQUIRED = [
    "source_id", "title", "news_types_supported", "categories_supported",
    "ingestion_mode", "origin_url", "recommended_usage", "notes",
    "licensing_note",
]


def load_manifest() -> List[SourceEntry]:
    """Load and validate source_manifest.json."""
    raw = _read_json("manifest")
    if not isinstance(raw, list):
        raise DatasetLoadError("source_manifest.json must be a JSON array")
    entries: List[SourceEntry] = []
    for i, item in enumerate(raw):
        _require_keys(item, _SOURCE_REQUIRED, f"manifest entry [{i}]")
        entries.append(SourceEntry(
            source_id=item["source_id"],
            title=item["title"],
            news_types_supported=item["news_types_supported"],
            categories_supported=item["categories_supported"],
            ingestion_mode=item["ingestion_mode"],
            local_path=item.get("local_path"),
            origin_url=item["origin_url"],
            recommended_usage=item["recommended_usage"],
            notes=item["notes"],
            licensing_note=item["licensing_note"],
        ))
    return entries


def load_taxonomy() -> Dict[str, NewsTypeDef]:
    """Load and validate event_taxonomy.json → dict keyed by news type."""
    raw = _read_json("taxonomy")
    if not isinstance(raw, dict) or "news_types" not in raw:
        raise DatasetLoadError("event_taxonomy.json must have a top-level 'news_types' object")
    result: Dict[str, NewsTypeDef] = {}
    for nt_name, nt_obj in raw["news_types"].items():
        _require_keys(nt_obj, ["description", "categories"], f"taxonomy[{nt_name}]")
        cats: Dict[str, CategoryDef] = {}
        for cat_name, cat_obj in nt_obj["categories"].items():
            _require_keys(cat_obj, ["description"], f"taxonomy[{nt_name}].{cat_name}")
            cats[cat_name] = CategoryDef(name=cat_name, description=cat_obj["description"])
        result[nt_name] = NewsTypeDef(
            name=nt_name,
            description=nt_obj["description"],
            categories=cats,
        )
    return result


_EVENT_REQUIRED = [
    "event_id", "news_type", "category", "title", "date_label", "region",
    "severity", "short_summary", "affected_asset_classes",
    "directional_impact", "beginner_explanation", "retrieval_tags", "status",
]


def load_events() -> List[HistoricalEvent]:
    """Load and validate historical_events.json."""
    raw = _read_json("events")
    if not isinstance(raw, list):
        raise DatasetLoadError("historical_events.json must be a JSON array")
    events: List[HistoricalEvent] = []
    for i, item in enumerate(raw):
        _require_keys(item, _EVENT_REQUIRED, f"events[{i}]")
        events.append(HistoricalEvent(
            event_id=item["event_id"],
            news_type=item["news_type"],
            category=item["category"],
            title=item["title"],
            historical_basis_source_ids=item.get("historical_basis_source_ids", []),
            date_label=item["date_label"],
            region=item["region"],
            severity=item["severity"],
            short_summary=item["short_summary"],
            affected_asset_classes=item["affected_asset_classes"],
            directional_impact=item["directional_impact"],
            beginner_explanation=item["beginner_explanation"],
            retrieval_tags=item["retrieval_tags"],
            status=item["status"],
        ))
    return events


def load_templates() -> Dict[str, Dict[str, List[HeadlineTemplate]]]:
    """Load headline_templates.json → {news_type: {category: [templates]}}."""
    raw = _read_json("templates")
    if not isinstance(raw, dict):
        raise DatasetLoadError("headline_templates.json must be a JSON object")
    result: Dict[str, Dict[str, List[HeadlineTemplate]]] = {}
    for nt_name, cats in raw.items():
        result[nt_name] = {}
        for cat_name, tmpl_list in cats.items():
            templates: List[HeadlineTemplate] = []
            for j, t in enumerate(tmpl_list):
                _require_keys(
                    t,
                    ["template_id", "headline", "body", "beginner_explainer"],
                    f"templates[{nt_name}][{cat_name}][{j}]",
                )
                templates.append(HeadlineTemplate(
                    template_id=t["template_id"],
                    headline=t["headline"],
                    body=t["body"],
                    beginner_explainer=t["beginner_explainer"],
                ))
            result[nt_name][cat_name] = templates
    return result


def load_all():
    """Convenience: load all four curated datasets. Returns a 4-tuple."""
    return load_manifest(), load_taxonomy(), load_events(), load_templates()


# ---------------------------------------------------------------------------
# Enriched events (optional)
# ---------------------------------------------------------------------------

_ENRICHED_FILE = _CURATED_DIR / "historical_events_enriched.json"

_ENRICHED_REQUIRED = [
    "event_id", "news_type", "category", "title", "date_label", "region",
    "severity", "short_summary", "affected_asset_classes",
    "directional_impact", "beginner_explanation", "retrieval_tags", "status",
]


def load_enriched_events() -> List[HistoricalEvent]:
    """Load historical_events_enriched.json into HistoricalEvent objects.

    The enriched file has extra fields (``source_type``, ``source_refs``,
    ``confidence``, ``derivation_method``) that are mapped into
    ``historical_basis_source_ids`` and ``retrieval_tags`` so the records
    work seamlessly with the existing retrieval system.

    Raises ``DatasetLoadError`` if the file is missing or malformed.
    """
    if not _ENRICHED_FILE.exists():
        raise DatasetLoadError(f"Missing enriched file: {_ENRICHED_FILE}")
    try:
        data = json.loads(_ENRICHED_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise DatasetLoadError(f"Invalid JSON in enriched file: {exc}") from exc

    raw_events = data.get("events", [])
    if not isinstance(raw_events, list):
        raise DatasetLoadError("enriched file 'events' must be a JSON array")

    events: List[HistoricalEvent] = []
    for i, item in enumerate(raw_events):
        _require_keys(item, _ENRICHED_REQUIRED, f"enriched_events[{i}]")
        events.append(HistoricalEvent(
            event_id=item["event_id"],
            news_type=item["news_type"],
            category=item["category"],
            title=item["title"],
            historical_basis_source_ids=item.get("source_refs", []),
            date_label=item["date_label"],
            region=item["region"],
            severity=item["severity"],
            short_summary=item["short_summary"],
            affected_asset_classes=item["affected_asset_classes"],
            directional_impact=item["directional_impact"],
            beginner_explanation=item["beginner_explanation"],
            retrieval_tags=item["retrieval_tags"],
            status=item["status"],
        ))
    return events


def load_events_combined() -> List[HistoricalEvent]:
    """Load original + enriched events into a single list.

    If the enriched file doesn't exist, falls back to original only.
    """
    base = load_events()
    try:
        enriched = load_enriched_events()
    except DatasetLoadError:
        return base
    return base + enriched
