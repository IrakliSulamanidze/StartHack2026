"""
Deterministic retrieval over curated historical events.

No embeddings, no LLM calls, no randomness, no network access.
Scoring is a simple weighted rule-based system.
"""

from __future__ import annotations

from typing import List, Optional

from .models import HistoricalEvent, RetrievalQuery, RetrievalResult

# ---------------------------------------------------------------------------
# Scoring weights
# ---------------------------------------------------------------------------

_W_NEWS_TYPE = 40
_W_CATEGORY = 30
_W_REGION = 10
_W_SEVERITY = 10
_W_ASSET_OVERLAP = 8          # scaled by fraction of overlap
_W_STATUS_BONUS = 2           # small boost for "ready_for_curation"


# ---------------------------------------------------------------------------
# Scoring function
# ---------------------------------------------------------------------------

def _score_event(event: HistoricalEvent, query: RetrievalQuery) -> RetrievalResult:
    """Score a single event against a query.  Deterministic and pure."""
    score = 0.0
    reasons: List[str] = []

    # News type — must match for the event to be highly relevant
    if event.news_type == query.news_type:
        score += _W_NEWS_TYPE
        reasons.append(f"news_type={query.news_type}")

    # Category — exact match is the strongest signal
    if event.category == query.category:
        score += _W_CATEGORY
        reasons.append(f"category={query.category}")

    # Region (optional filter)
    if query.region is not None:
        if event.region == query.region or event.region == "global":
            score += _W_REGION
            reasons.append(f"region={event.region}")

    # Severity proximity (optional)
    if query.severity is not None:
        diff = abs(event.severity - query.severity)
        # full points at diff 0, declining linearly to 0 at diff ≥ 5
        sev_score = max(0.0, _W_SEVERITY * (1 - diff / 5))
        if sev_score > 0:
            score += sev_score
            reasons.append(f"severity_diff={diff}")

    # Asset-class overlap (optional)
    if query.affected_asset_classes:
        query_set = set(query.affected_asset_classes)
        event_set = set(event.affected_asset_classes)
        overlap = query_set & event_set
        if overlap:
            frac = len(overlap) / len(query_set)
            score += _W_ASSET_OVERLAP * frac
            reasons.append(f"asset_overlap={','.join(sorted(overlap))}")

    # Tag match (optional bonus)
    if query.tags:
        tag_set = set(t.lower() for t in query.tags)
        event_tags = set(t.lower() for t in event.retrieval_tags)
        tag_overlap = tag_set & event_tags
        if tag_overlap:
            score += len(tag_overlap) * 1.0   # 1 point per tag hit
            reasons.append(f"tag_hits={','.join(sorted(tag_overlap))}")

    # Status boost
    if event.status == "ready_for_curation":
        score += _W_STATUS_BONUS
        reasons.append("status=ready")

    return RetrievalResult(event=event, score=score, match_reasons=reasons)


# ---------------------------------------------------------------------------
# Public retrieval function
# ---------------------------------------------------------------------------

def retrieve(
    events: List[HistoricalEvent],
    query: RetrievalQuery,
) -> List[RetrievalResult]:
    """Return the top-k events matching *query*, sorted by score descending.

    Ties are broken deterministically by ``event_id`` (ascending).
    """
    results = [_score_event(e, query) for e in events]
    # Deterministic sort: highest score first, then by event_id for stability
    results.sort(key=lambda r: (-r.score, r.event.event_id))
    return results[: query.top_k]
