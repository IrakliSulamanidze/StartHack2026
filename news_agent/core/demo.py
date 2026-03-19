#!/usr/bin/env python3
"""
Quick local demo — loads curated data, runs 3 sample queries, prints results.

Usage (from repo root):
    python -m news_agent.core.demo
"""

from __future__ import annotations

from .loader import load_events, load_templates
from .models import RetrievalQuery
from .retrieval import retrieve
from .templates import list_available, lookup


def _sep(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")


def main() -> None:
    events = load_events()
    templates = load_templates()

    print(f"Loaded {len(events)} historical events")
    print(f"Template coverage: {list_available(templates)}")

    # --- Query 1: major + banking_panic ---
    _sep("Query 1: major / banking_panic")
    q1 = RetrievalQuery(news_type="major", category="banking_panic", top_k=3)
    for r in retrieve(events, q1):
        print(f"  [{r.score:5.1f}] {r.event.event_id}: {r.event.title}")
        print(f"         reasons: {', '.join(r.match_reasons)}")
    tmpl = lookup(templates, "major", "banking_panic")
    print(f"  Templates available: {len(tmpl)}")
    if tmpl:
        print(f"  First headline: {tmpl[0].headline}")

    # --- Query 2: impactful + inflation_surprise ---
    _sep("Query 2: impactful / inflation_surprise (region=us, severity=4)")
    q2 = RetrievalQuery(
        news_type="impactful",
        category="inflation_surprise",
        region="us",
        severity=4,
        top_k=3,
    )
    for r in retrieve(events, q2):
        print(f"  [{r.score:5.1f}] {r.event.event_id}: {r.event.title}")
        print(f"         reasons: {', '.join(r.match_reasons)}")
    tmpl = lookup(templates, "impactful", "inflation_surprise")
    print(f"  Templates available: {len(tmpl)}")
    if tmpl:
        print(f"  First headline: {tmpl[0].headline}")

    # --- Query 3: ordinary + market_chatter (tests fallback) ---
    _sep("Query 3: ordinary / market_chatter (asset_classes=[equities])")
    q3 = RetrievalQuery(
        news_type="ordinary",
        category="market_chatter",
        affected_asset_classes=["equities"],
        top_k=3,
    )
    results = retrieve(events, q3)
    if results:
        for r in results:
            print(f"  [{r.score:5.1f}] {r.event.event_id}: {r.event.title}")
    else:
        print("  No matching events (expected — ordinary events are template-only)")
    tmpl = lookup(templates, "ordinary", "market_chatter")
    print(f"  Templates available: {len(tmpl)}")
    if tmpl:
        print(f"  First headline: {tmpl[0].headline}")

    print()


if __name__ == "__main__":
    main()
