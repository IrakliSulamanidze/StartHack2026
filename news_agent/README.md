# News Agent — Historical News & Narrative Layer

## Purpose

This module provides the **narrative layer** for Wealth Manager Arena.
It generates contextual news headlines, explanations, and market commentary
that help beginner players understand *why* markets moved — without altering
the simulation itself.

## Key Principles

| Principle | Detail |
|---|---|
| **Deterministic backend is authoritative** | All prices, returns, and portfolio math are computed by `backend/`. This module never overrides or feeds back into the simulation engine. |
| **Narrative only** | News items produced here are cosmetic/educational. They explain and illustrate — they do not drive gameplay outcomes. |
| **Historical grounding** | Major and Impactful news should reference real historical events (recessions, rate hikes, oil shocks, crises) drawn from curated datasets, not invented facts. |
| **Template fallback** | Ordinary (routine) news is generated from lightweight headline templates — no historical source required. |
| **Offline-first** | All datasets are local files or embedded JSON. No live API calls at runtime. |

## News Types

1. **Major** — the biggest global events: crashes, wars, banking panics, emergency interventions. Always grounded in curated historical sources.
2. **Impactful** — important but secondary: rate hikes, inflation surprises, oil spikes, policy shifts. Grounded where possible.
3. **Ordinary** — small routine market chatter, sector rotation, earnings tone. Template-based; no historical grounding required.

## Current Status

> **Curated dataset loading + deterministic retrieval implemented.**
> **Still not wired into runtime.**

What works today:
- `core/loader.py` — loads and validates all four curated JSON files
- `core/retrieval.py` — deterministic rule-based retrieval over historical events
- `core/templates.py` — headline template lookup with fallback
- `core/models.py` — typed dataclass structures for all dataset records
- `core/demo.py` — runnable sanity-check script
- `tests/` — pytest suite covering loading, errors, retrieval, and templates

What is **not** done yet:
- No raw-file parsing (XLS/XML/PDF/ZIP)
- No FastAPI routes or runtime integration
- No frontend wiring
- No LLM or embedding calls

### Quick start

```bash
# Run the demo (from repo root)
python -m news_agent.core.demo

# Run the tests (from repo root)
python -m pytest news_agent/tests/ -v
```

## Folder Structure

```
news_agent/
  README.md              ← you are here
  core/
    __init__.py
    models.py            ← dataclass types for all dataset records
    loader.py            ← JSON loading + lightweight validation
    retrieval.py         ← deterministic event retrieval/ranking
    templates.py         ← headline template lookup with fallback
    demo.py              ← local sanity-check script
  datasets/
    README.md            ← dataset guide
    raw/                 ← original source files (Excel, XML, PDF, JSON)
      major/
      impactful/
      ordinary/
    curated/             ← normalised, ready-to-use JSON
      source_manifest.json
      event_taxonomy.json
      historical_events.json
      headline_templates.json
    scripts/
      README.md          ← future ingestion/validation scripts
  tests/
    __init__.py
    test_loader.py       ← loading + validation + error tests
    test_retrieval.py    ← retrieval + template lookup tests
```
