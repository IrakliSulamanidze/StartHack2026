"""
Gemini provider — uses Google Generative AI for richer narrative.

Security rules:
- API key is read ONLY from the GEMINI_API_KEY environment variable.
- No key is ever hardcoded, logged, or committed.
- If the key is missing or the API call fails, the caller should
  fall back to template_only mode.

The prompt is strictly bounded: it includes only structured simulation
input, retrieved historical examples, and the template context.
The model is explicitly instructed NOT to invent unsupported numbers,
institutions, dates, or market logic.
"""

from __future__ import annotations

import json
import logging
import os
from typing import List, Optional

from ..core.models import HeadlineTemplate, RetrievalResult
from .models import ComposedArticle, HistoricalExample, SimulationContext
from .providers import Provider
from .template_provider import _build_historical_example

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are a financial news writer for a beginner-friendly investment \
simulation game called "Wealth Manager Arena".

STRICT RULES — you MUST follow these:
1. Use ONLY the facts provided in the SIMULATION CONTEXT below.
2. Do NOT invent numbers, percentages, institution names, dates, or \
   market mechanics that are not in the context.
3. Do NOT invent named institutions unless they appear in the provided \
   historical examples.
4. Do NOT invent exact real-world dates unless they appear in the \
   retrieved historical source data.
5. Do NOT contradict the scenario's category, news_type, or severity.
6. Write in a clear, accessible tone suitable for someone who has never \
   invested before.
7. Your output MUST be valid JSON with exactly three keys: \
   "headline", "short_bulletin", "beginner_explanation".
8. The headline should be max 150 characters.
9. The short_bulletin should be 2-4 sentences.
10. The beginner_explanation should be 1-3 sentences, very simple language.
11. Do NOT include disclaimers, meta-commentary, or references to yourself.
"""


def _build_user_prompt(
    ctx: SimulationContext,
    retrieved: List[RetrievalResult],
    template: HeadlineTemplate,
) -> str:
    """Build the user prompt from structured inputs only."""
    parts: List[str] = []

    # Simulation context
    parts.append("=== SIMULATION CONTEXT ===")
    parts.append(f"Regime: {ctx.regime_name}")
    parts.append(f"Turn: {ctx.turn_number}")
    parts.append(f"News type: {ctx.news_type} / {ctx.category}")
    parts.append(f"Region: {ctx.region}")
    parts.append(f"Severity: {ctx.severity}/5")
    parts.append(f"Catalyst: {ctx.catalyst}")
    if ctx.historical_ref:
        parts.append(f"Historical reference: {ctx.historical_ref}")
    if ctx.scenario_id:
        parts.append(f"Scenario ID: {ctx.scenario_id}")
    if ctx.directional_impact:
        parts.append("Directional impact:")
        for asset, direction in ctx.directional_impact.items():
            parts.append(f"  {asset}: {direction}")
    if ctx.benchmark_move is not None:
        parts.append(f"Benchmark move: {ctx.benchmark_move:+.1f}%")
    if ctx.educational_tags:
        parts.append(f"Educational tags: {', '.join(ctx.educational_tags)}")
    parts.append("Asset returns this turn:")
    for asset, ret in ctx.asset_returns.items():
        parts.append(f"  {asset}: {ret:+.1f}%")

    # Retrieved historical examples (bounded to top 3)
    if retrieved:
        parts.append("\n=== HISTORICAL EXAMPLES (for tone/style reference only) ===")
        for r in retrieved[:3]:
            e = r.event
            parts.append(f"- {e.title} ({e.date_label}, severity {e.severity})")
            parts.append(f"  Summary: {e.short_summary}")
            if e.beginner_explanation:
                parts.append(f"  Beginner note: {e.beginner_explanation}")

    # Template reference
    parts.append("\n=== TEMPLATE REFERENCE (style guide) ===")
    parts.append(f"Headline pattern: {template.headline}")
    parts.append(f"Body pattern: {template.body}")
    parts.append(f"Explainer pattern: {template.beginner_explainer}")

    parts.append("\n=== TASK ===")
    parts.append(
        "Write a news article for this simulation turn. "
        "Return ONLY valid JSON: "
        '{"headline": "...", "short_bulletin": "...", "beginner_explanation": "..."}'
    )

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Response parsing
# ---------------------------------------------------------------------------

def _parse_gemini_response(text: str) -> Optional[dict]:
    """Extract headline/short_bulletin/beginner_explanation from Gemini's response.

    Returns None if the response is not valid JSON with required keys.
    """
    # Strip markdown code fences if present
    cleaned = text.strip()
    if cleaned.startswith("```"):
        # Remove opening fence (```json or ```)
        first_newline = cleaned.index("\n")
        cleaned = cleaned[first_newline + 1:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        return None

    if not isinstance(data, dict):
        return None

    required = {"headline", "short_bulletin", "beginner_explanation"}
    # Also accept legacy "body" key as alias for short_bulletin
    if "body" in data and "short_bulletin" not in data:
        data["short_bulletin"] = data.pop("body")

    if not required.issubset(data.keys()):
        return None

    # All three must be non-empty strings
    for key in required:
        if not isinstance(data[key], str) or not data[key].strip():
            return None

    return data


# ---------------------------------------------------------------------------
# Provider
# ---------------------------------------------------------------------------

class GeminiProvider(Provider):
    """Google Gemini-backed composition provider.

    Reads the API key from ``GEMINI_API_KEY`` environment variable.
    Call ``is_available()`` to check whether the provider can be used.
    """

    def __init__(self) -> None:
        self._api_key: Optional[str] = os.environ.get("GEMINI_API_KEY")
        self._client = None

    def is_available(self) -> bool:
        """Return True if GEMINI_API_KEY is set and non-empty."""
        return bool(self._api_key and self._api_key.strip())

    def _get_client(self):
        """Lazy-init the Gemini client.  Import is deferred so the
        ``google-genai`` dependency is truly optional."""
        if self._client is not None:
            return self._client
        try:
            from google import genai
            self._client = genai.Client(api_key=self._api_key)
            return self._client
        except Exception as exc:
            logger.warning("Failed to initialise Gemini client: %s", exc)
            return None

    @property
    def name(self) -> str:
        return "gemini"

    def compose(
        self,
        ctx: SimulationContext,
        retrieved: List[RetrievalResult],
        template: HeadlineTemplate,
    ) -> ComposedArticle:
        """Generate a composed article via Gemini.

        Raises ``RuntimeError`` if the API call fails or the response
        cannot be parsed.  The caller (``compose_article``) catches this
        and falls back to template_only mode.

        NOTE: The ``historical_example`` is built deterministically from
        retrieved events and is NOT generated by Gemini.
        """
        client = self._get_client()
        if client is None:
            raise RuntimeError("Gemini client not available")

        user_prompt = _build_user_prompt(ctx, retrieved, template)

        try:
            from google.genai import types
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=_SYSTEM_PROMPT + "\n\n" + user_prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=512,
                ),
            )
        except Exception as exc:
            raise RuntimeError(f"Gemini API call failed: {exc}") from exc

        raw_text = response.text if hasattr(response, "text") else ""
        parsed = _parse_gemini_response(raw_text)
        if parsed is None:
            raise RuntimeError(
                f"Gemini returned unparseable response: {raw_text[:200]}"
            )

        # Historical example is ALWAYS from deterministic retrieval
        historical_example = _build_historical_example(retrieved, ctx)
        selected_ids = [r.event.event_id for r in retrieved]

        return ComposedArticle(
            headline=parsed["headline"],
            short_bulletin=parsed["short_bulletin"],
            beginner_explanation=parsed["beginner_explanation"],
            historical_example=historical_example,
            selected_event_ids=selected_ids,
            generation_mode="gemini",
            validation_flags=[],
            source="gemini",
            template_id=template.template_id,
            historical_event_id=(
                retrieved[0].event.event_id if retrieved else None
            ),
        )
