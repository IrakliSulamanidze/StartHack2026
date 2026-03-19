"""
Mock provider — returns canned responses for testing.

Useful for integration tests that need a provider but must not make
network calls or require an API key.
"""

from __future__ import annotations

from typing import List

from ..core.models import HeadlineTemplate, RetrievalResult
from .models import ComposedArticle, HistoricalExample, SimulationContext
from .providers import Provider


class MockProvider(Provider):
    """Returns fixed, deterministic articles.  No external deps."""

    @property
    def name(self) -> str:
        return "mock"

    def compose(
        self,
        ctx: SimulationContext,
        retrieved: List[RetrievalResult],
        template: HeadlineTemplate,
    ) -> ComposedArticle:
        historical_example = None
        selected_ids: list[str] = []
        if retrieved:
            best = retrieved[0]
            e = best.event
            selected_ids = [r.event.event_id for r in retrieved]
            historical_example = HistoricalExample(
                title=e.title,
                why_similar=f"[MOCK] Similar {ctx.category} event.",
                what_happened=e.short_summary,
                beginner_takeaway=e.beginner_explanation,
                source_event_ids=[e.event_id],
            )

        return ComposedArticle(
            headline=f"[MOCK] {ctx.category} headline for turn {ctx.turn_number}",
            short_bulletin=f"[MOCK] Bulletin: {ctx.catalyst} during {ctx.regime_name}.",
            beginner_explanation=f"[MOCK] This is a mock explanation for {ctx.category}.",
            historical_example=historical_example,
            selected_event_ids=selected_ids,
            generation_mode="mock",
            validation_flags=[],
            source="mock",
            template_id=template.template_id,
            historical_event_id=(
                retrieved[0].event.event_id if retrieved else None
            ),
        )
