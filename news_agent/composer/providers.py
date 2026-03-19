"""
Provider interface and factory for the composer layer.

Every provider implements the same ``compose`` method, returning a
``ComposedArticle``.  The factory selects the active provider based
on an explicit mode string.
"""

from __future__ import annotations

import abc
from typing import List, Optional

from ..core.models import HeadlineTemplate, RetrievalResult
from .models import ComposedArticle, SimulationContext


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------

class Provider(abc.ABC):
    """Base class for all composition providers."""

    @abc.abstractmethod
    def compose(
        self,
        ctx: SimulationContext,
        retrieved: List[RetrievalResult],
        template: HeadlineTemplate,
    ) -> ComposedArticle:
        """Generate a composed article from simulation context.

        Parameters
        ----------
        ctx : SimulationContext
            Structured simulation state — the ONLY factual input.
        retrieved : list[RetrievalResult]
            Top-k historical events matched by the retrieval layer.
        template : HeadlineTemplate
            The deterministic template selected for this news_type/category.

        Returns
        -------
        ComposedArticle
        """

    @property
    @abc.abstractmethod
    def name(self) -> str:
        """Short identifier for this provider (used in ComposedArticle.source)."""


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

_VALID_MODES = {"template_only", "mock", "gemini"}


def get_provider(mode: str = "template_only") -> Provider:
    """Create and return a provider instance for the given *mode*.

    Raises ``ValueError`` for unknown modes.
    """
    if mode not in _VALID_MODES:
        raise ValueError(
            f"Unknown provider mode {mode!r}. "
            f"Valid modes: {', '.join(sorted(_VALID_MODES))}"
        )

    if mode == "template_only":
        from .template_provider import TemplateProvider
        return TemplateProvider()

    if mode == "mock":
        from .mock_provider import MockProvider
        return MockProvider()

    # mode == "gemini"
    from .gemini_provider import GeminiProvider
    provider = GeminiProvider()
    if not provider.is_available():
        # Graceful fallback: no key → template_only
        from .template_provider import TemplateProvider
        return TemplateProvider()
    return provider
