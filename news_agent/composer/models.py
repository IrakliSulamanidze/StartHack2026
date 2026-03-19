"""
Data models for the composer layer.

These are plain dataclasses representing the inputs and outputs of the
news composition pipeline.  They are deliberately decoupled from the
core models so the composer can evolve independently.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class SimulationContext:
    """Structured snapshot of the current simulation state.

    This is the *only* information a provider may reference when
    generating narrative.  Providers must NOT invent numbers,
    institutions, dates, or market logic beyond what is supplied here.
    """
    regime_name: str                         # e.g. "recession"
    turn_number: int
    news_type: str                           # "major" | "impactful" | "ordinary"
    category: str                            # e.g. "banking_panic"
    region: str                              # e.g. "us", "global"
    severity: int                            # 1-5
    asset_returns: Dict[str, float]          # e.g. {"equities": -3.2, "bonds": 0.5}
    catalyst: str                            # short phrase describing the trigger
    historical_ref: Optional[str] = None     # e.g. "2008 GFC"
    extra: Dict[str, str] = field(default_factory=dict)
    # Extended fields for richer scenario input
    scenario_id: Optional[str] = None
    turn_id: Optional[str] = None
    directional_impact: Optional[Dict[str, str]] = None
    benchmark_move: Optional[float] = None
    educational_tags: Optional[List[str]] = None


@dataclass
class HistoricalExample:
    """Beginner-friendly panel based on the real historical analog
    that grounded the article generation — NOT the fictional game article."""
    title: str
    why_similar: str
    what_happened: str
    beginner_takeaway: str
    source_event_ids: List[str]


@dataclass
class ComposedArticle:
    """Output of the composition pipeline."""
    headline: str
    short_bulletin: str
    beginner_explanation: str
    historical_example: Optional[HistoricalExample]
    selected_event_ids: List[str]
    generation_mode: str                     # "template_only" | "mock" | "gemini"
    validation_flags: List[str]
    # Legacy aliases kept for internal plumbing
    source: str = ""                         # "template" | "mock" | "gemini"
    historical_event_id: Optional[str] = None
    template_id: Optional[str] = None

    def to_dict(self) -> dict:
        """Serialise to the contract output shape."""
        return {
            "headline": self.headline,
            "short_bulletin": self.short_bulletin,
            "beginner_explanation": self.beginner_explanation,
            "historical_example": {
                "title": self.historical_example.title,
                "why_similar": self.historical_example.why_similar,
                "what_happened": self.historical_example.what_happened,
                "beginner_takeaway": self.historical_example.beginner_takeaway,
                "source_event_ids": self.historical_example.source_event_ids,
            } if self.historical_example else None,
            "selected_event_ids": self.selected_event_ids,
            "generation_mode": self.generation_mode,
            "validation_flags": self.validation_flags,
        }
