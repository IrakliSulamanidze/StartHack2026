"""
Typed data structures for the news-agent curated dataset.

Stdlib-only: uses dataclasses + typing.  No Pydantic dependency.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


# ---------------------------------------------------------------------------
# Source manifest
# ---------------------------------------------------------------------------

@dataclass
class SourceEntry:
    source_id: str
    title: str
    news_types_supported: List[str]
    categories_supported: List[str]
    ingestion_mode: str          # "local_file" | "external_reference"
    local_path: Optional[str]
    origin_url: str
    recommended_usage: str
    notes: str
    licensing_note: str


# ---------------------------------------------------------------------------
# Event taxonomy
# ---------------------------------------------------------------------------

@dataclass
class CategoryDef:
    name: str
    description: str


@dataclass
class NewsTypeDef:
    name: str
    description: str
    categories: Dict[str, CategoryDef]


# ---------------------------------------------------------------------------
# Historical events
# ---------------------------------------------------------------------------

@dataclass
class HistoricalEvent:
    event_id: str
    news_type: str
    category: str
    title: str
    historical_basis_source_ids: List[str]
    date_label: str
    region: str
    severity: int                # 1-5
    short_summary: str
    affected_asset_classes: List[str]
    directional_impact: Dict[str, str]
    beginner_explanation: str
    retrieval_tags: List[str]
    status: str                  # "placeholder" | "ready_for_curation"


# ---------------------------------------------------------------------------
# Headline templates
# ---------------------------------------------------------------------------

@dataclass
class HeadlineTemplate:
    template_id: str
    headline: str
    body: str
    beginner_explainer: str


# ---------------------------------------------------------------------------
# Retrieval query / result
# ---------------------------------------------------------------------------

@dataclass
class RetrievalQuery:
    news_type: str
    category: str
    region: Optional[str] = None
    severity: Optional[int] = None
    affected_asset_classes: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    top_k: int = 3


@dataclass
class RetrievalResult:
    event: HistoricalEvent
    score: float
    match_reasons: List[str] = field(default_factory=list)
