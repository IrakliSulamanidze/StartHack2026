#!/usr/bin/env python3
"""
Composer demo — demonstrates all three provider modes.

Usage (from repo root):
    python -m news_agent.composer.demo                  # template_only (default)
    python -m news_agent.composer.demo --mode mock      # mock provider
    python -m news_agent.composer.demo --mode gemini    # gemini (needs GEMINI_API_KEY)
"""

from __future__ import annotations

import argparse
import json
import sys

from .compose import compose_article
from .models import SimulationContext


def _sample_context() -> SimulationContext:
    """Build a sample simulation context for demo purposes."""
    return SimulationContext(
        regime_name="financial_crisis",
        turn_number=5,
        news_type="major",
        category="banking_panic",
        region="us",
        severity=5,
        asset_returns={
            "equities": -8.2,
            "bonds": 1.5,
            "gold": 3.1,
        },
        catalyst="Major investment bank reports insolvency",
        historical_ref="2008 GFC",
        scenario_id="demo_scenario_001",
        turn_id="demo_turn_005",
        directional_impact={"equities": "strongly_negative", "bonds": "positive", "gold": "positive"},
        benchmark_move=-6.5,
        educational_tags=["systemic_risk", "bank_failure", "flight_to_safety"],
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Composer demo")
    parser.add_argument(
        "--mode",
        choices=["template_only", "mock", "gemini"],
        default="template_only",
        help="Provider mode (default: template_only)",
    )
    args = parser.parse_args()

    ctx = _sample_context()
    print(f"Mode: {args.mode}")
    print(f"Context: {ctx.regime_name}, turn {ctx.turn_number}, {ctx.news_type}/{ctx.category}")
    print()

    article = compose_article(ctx, mode=args.mode)

    # Pretty-print the contract output shape
    output = article.to_dict()
    print(json.dumps(output, indent=2, ensure_ascii=False))

    print()
    print(f"--- Internal metadata ---")
    print(f"source: {article.source}")
    if article.template_id:
        print(f"template_id: {article.template_id}")
    if article.historical_event_id:
        print(f"historical_event_id: {article.historical_event_id}")


if __name__ == "__main__":
    main()
