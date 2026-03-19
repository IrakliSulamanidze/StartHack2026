"""
Template-only provider — deterministic, no external dependencies.

Fills ``{{placeholder}}`` tokens in the headline template using values
drawn exclusively from the SimulationContext.  This is the default and
fallback provider.
"""

from __future__ import annotations

import re
from typing import Dict, List

from ..core.models import HeadlineTemplate, RetrievalResult
from .models import ComposedArticle, HistoricalExample, SimulationContext
from .providers import Provider


def _build_replacements(ctx: SimulationContext) -> Dict[str, str]:
    """Build a placeholder → value map from a SimulationContext."""
    repl: Dict[str, str] = {
        "catalyst": ctx.catalyst,
        "regime_name": ctx.regime_name,
        "region": ctx.region,
        "severity": str(ctx.severity),
        "turn_number": str(ctx.turn_number),
    }
    # Historical reference
    if ctx.historical_ref:
        repl["historical_ref"] = ctx.historical_ref
    # Asset return helpers
    for asset, ret in ctx.asset_returns.items():
        repl[f"{asset}_return"] = f"{ret:+.1f}%"
        # common alias: pct_drop for negative returns
        if ret < 0:
            repl["pct_drop"] = f"{abs(ret):.1f}"
    # Extra context
    repl.update(ctx.extra)
    return repl


_PLACEHOLDER_RE = re.compile(r"\{\{(\w+)\}\}")


def _fill(template_text: str, repl: Dict[str, str]) -> str:
    """Replace ``{{key}}`` placeholders with values from *repl*.

    Unknown placeholders are left as-is (safe — no crash on missing keys).
    """
    def _sub(m: re.Match) -> str:
        key = m.group(1)
        return repl.get(key, m.group(0))
    return _PLACEHOLDER_RE.sub(_sub, template_text)


def _build_historical_example(retrieved: List[RetrievalResult], ctx: SimulationContext) -> HistoricalExample | None:
    """Build a HistoricalExample from the best retrieved event.

    Returns None if no retrieved events are available.
    """
    if not retrieved:
        return None
    best = retrieved[0]
    e = best.event
    return HistoricalExample(
        title=e.title,
        why_similar=(
            f"Both involve a {ctx.category.replace('_', ' ')} event "
            f"in the {ctx.region.upper()} region with severity {e.severity}/5."
        ),
        what_happened=e.short_summary,
        beginner_takeaway=e.beginner_explanation,
        source_event_ids=[e.event_id],
    )


class TemplateProvider(Provider):
    """Deterministic template-based composition.  Zero external deps."""

    @property
    def name(self) -> str:
        return "template"

    def compose(
        self,
        ctx: SimulationContext,
        retrieved: List[RetrievalResult],
        template: HeadlineTemplate,
    ) -> ComposedArticle:
        repl = _build_replacements(ctx)

        # If retrieval found a good match, inject its info as extra context
        if retrieved:
            best = retrieved[0]
            repl.setdefault("historical_ref", best.event.title)
            repl.setdefault("historical_event_id", best.event.event_id)

        headline = _fill(template.headline, repl)
        body = _fill(template.body, repl)
        explanation = _fill(template.beginner_explainer, repl)
        historical_example = _build_historical_example(retrieved, ctx)

        selected_ids = [r.event.event_id for r in retrieved]

        return ComposedArticle(
            headline=headline,
            short_bulletin=body,
            beginner_explanation=explanation,
            historical_example=historical_example,
            selected_event_ids=selected_ids,
            generation_mode="template_only",
            validation_flags=[],
            source="template",
            template_id=template.template_id,
            historical_event_id=repl.get("historical_event_id"),
        )
