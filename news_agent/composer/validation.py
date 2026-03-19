"""
Validation utilities for composed articles.

Ensures that provider output (especially from LLM providers) meets
minimum quality and safety constraints before being returned to callers.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List

from .models import ComposedArticle

# ---------------------------------------------------------------------------
# Constraints
# ---------------------------------------------------------------------------

_MIN_HEADLINE_LEN = 10
_MAX_HEADLINE_LEN = 200
_MIN_BODY_LEN = 30
_MAX_BODY_LEN = 2000
_MIN_EXPLANATION_LEN = 20
_MAX_EXPLANATION_LEN = 1500
_VALID_SOURCES = {"template", "mock", "gemini"}
_VALID_MODES = {"template_only", "mock", "gemini"}


@dataclass
class ValidationResult:
    valid: bool
    errors: List[str]


def validate_article(article: ComposedArticle) -> ValidationResult:
    """Validate a ComposedArticle for structural and content integrity.

    Returns a ValidationResult with ``valid=True`` if the article passes
    all checks, or ``valid=False`` with a list of error descriptions.
    """
    errors: List[str] = []

    # --- Required fields must be non-empty strings ---
    if not article.headline or not article.headline.strip():
        errors.append("headline is empty")
    if not article.short_bulletin or not article.short_bulletin.strip():
        errors.append("short_bulletin is empty")
    if not article.beginner_explanation or not article.beginner_explanation.strip():
        errors.append("beginner_explanation is empty")

    # --- Length bounds ---
    if article.headline and len(article.headline) < _MIN_HEADLINE_LEN:
        errors.append(f"headline too short ({len(article.headline)} < {_MIN_HEADLINE_LEN})")
    if article.headline and len(article.headline) > _MAX_HEADLINE_LEN:
        errors.append(f"headline too long ({len(article.headline)} > {_MAX_HEADLINE_LEN})")

    if article.short_bulletin and len(article.short_bulletin) < _MIN_BODY_LEN:
        errors.append(f"short_bulletin too short ({len(article.short_bulletin)} < {_MIN_BODY_LEN})")
    if article.short_bulletin and len(article.short_bulletin) > _MAX_BODY_LEN:
        errors.append(f"short_bulletin too long ({len(article.short_bulletin)} > {_MAX_BODY_LEN})")

    if article.beginner_explanation and len(article.beginner_explanation) < _MIN_EXPLANATION_LEN:
        errors.append(f"beginner_explanation too short ({len(article.beginner_explanation)} < {_MIN_EXPLANATION_LEN})")
    if article.beginner_explanation and len(article.beginner_explanation) > _MAX_EXPLANATION_LEN:
        errors.append(f"beginner_explanation too long ({len(article.beginner_explanation)} > {_MAX_EXPLANATION_LEN})")

    # --- Source / generation_mode must be known ---
    if article.source and article.source not in _VALID_SOURCES:
        errors.append(f"unknown source {article.source!r}")
    if article.generation_mode not in _VALID_MODES:
        errors.append(f"unknown generation_mode {article.generation_mode!r}")

    # --- Historical example structural check (if present) ---
    if article.historical_example is not None:
        he = article.historical_example
        if not he.title or not he.title.strip():
            errors.append("historical_example.title is empty")
        if not he.why_similar or not he.why_similar.strip():
            errors.append("historical_example.why_similar is empty")
        if not he.what_happened or not he.what_happened.strip():
            errors.append("historical_example.what_happened is empty")
        if not he.beginner_takeaway or not he.beginner_takeaway.strip():
            errors.append("historical_example.beginner_takeaway is empty")
        if not he.source_event_ids:
            errors.append("historical_example.source_event_ids is empty")

    return ValidationResult(valid=len(errors) == 0, errors=errors)
