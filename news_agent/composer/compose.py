"""
Main composer entry point — orchestrates retrieval, template lookup,
provider dispatch, validation, and fallback.

Usage::

    from news_agent.composer.compose import compose_article
    from news_agent.composer.models import SimulationContext

    ctx = SimulationContext(...)
    article = compose_article(ctx, mode="template_only")
"""

from __future__ import annotations

import logging
from typing import List, Optional

from ..core.loader import load_events_combined, load_templates
from ..core.models import RetrievalQuery, RetrievalResult
from ..core.retrieval import retrieve
from ..core.templates import lookup_one
from .models import ComposedArticle, SimulationContext
from .providers import get_provider
from .validation import validate_article

logger = logging.getLogger(__name__)


def compose_article(
    ctx: SimulationContext,
    mode: str = "template_only",
    top_k: int = 3,
) -> ComposedArticle:
    """Compose a news article for the given simulation context.

    Parameters
    ----------
    ctx : SimulationContext
        Current simulation state.
    mode : str
        Provider mode: ``"template_only"``, ``"mock"``, or ``"gemini"``.
    top_k : int
        Number of historical events to retrieve for context.

    Returns
    -------
    ComposedArticle
        Always returns a valid article.  If the chosen provider fails
        or produces invalid output, falls back to template_only.
    """
    # 1. Load data
    events = load_events_combined()
    templates = load_templates()

    # 2. Retrieve historical context
    query = RetrievalQuery(
        news_type=ctx.news_type,
        category=ctx.category,
        region=ctx.region,
        severity=ctx.severity,
        affected_asset_classes=list(ctx.asset_returns.keys()),
        top_k=top_k,
    )
    retrieved = retrieve(events, query)

    # 3. Select template
    template = lookup_one(templates, ctx.news_type, ctx.category)

    # 4. Get provider
    provider = get_provider(mode)

    # 5. Generate article
    try:
        article = provider.compose(ctx, retrieved, template)
    except Exception as exc:
        logger.warning("Provider %r failed: %s — falling back to template", mode, exc)
        from .template_provider import TemplateProvider
        article = TemplateProvider().compose(ctx, retrieved, template)
        article.validation_flags.append(f"provider_fallback:{mode}")

    # 6. Validate
    result = validate_article(article)
    if not result.valid:
        logger.warning(
            "Provider %r produced invalid article (%s) — falling back to template",
            mode, "; ".join(result.errors),
        )
        from .template_provider import TemplateProvider
        article = TemplateProvider().compose(ctx, retrieved, template)
        article.validation_flags.append(f"validation_fallback:{mode}")

    return article
