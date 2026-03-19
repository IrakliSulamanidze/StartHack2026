"""
Headline / body / explainer template lookup.

Given a news_type and category, returns matching templates from the
curated headline_templates.json.  Falls back gracefully when a specific
category has no templates.
"""

from __future__ import annotations

from typing import Dict, List, Optional

from .models import HeadlineTemplate


# Type alias for the loaded template tree
TemplateTree = Dict[str, Dict[str, List[HeadlineTemplate]]]

# ---------------------------------------------------------------------------
# Fallback template (used when no category-specific template exists)
# ---------------------------------------------------------------------------

_FALLBACK = HeadlineTemplate(
    template_id="_fallback",
    headline="Market Update: {{catalyst}}",
    body="Markets reacted to {{catalyst}}. Investors are watching closely for further developments.",
    beginner_explainer="Something happened in the market that moved prices. Keep an eye on the news for more details.",
)


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def lookup(
    templates: TemplateTree,
    news_type: str,
    category: str,
) -> List[HeadlineTemplate]:
    """Return templates for a given news_type + category.

    Falls back to:
    1. Any templates under the same news_type (first available category).
    2. A generic fallback template.
    """
    # Exact match
    cats = templates.get(news_type)
    if cats:
        exact = cats.get(category)
        if exact:
            return list(exact)
        # Fallback: first available category in this news type
        for cat_templates in cats.values():
            if cat_templates:
                return list(cat_templates)
    # Ultimate fallback
    return [_FALLBACK]


def lookup_one(
    templates: TemplateTree,
    news_type: str,
    category: str,
    index: int = 0,
) -> HeadlineTemplate:
    """Convenience: return a single template (by index within the list)."""
    matches = lookup(templates, news_type, category)
    return matches[index % len(matches)]


def list_available(templates: TemplateTree) -> Dict[str, List[str]]:
    """Return {news_type: [category, ...]} for all populated template slots."""
    return {
        nt: sorted(cats.keys())
        for nt, cats in templates.items()
        if cats
    }
