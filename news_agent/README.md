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

> **Curated datasets + normalization + enrichment + composer (with optional Gemini) implemented.**
> **Still not wired into runtime.**

What works today:
- `core/loader.py` — loads and validates curated JSON + enriched events
- `core/retrieval.py` — deterministic rule-based retrieval over historical events
- `core/templates.py` — headline template lookup with fallback
- `core/models.py` — typed dataclass structures for all dataset records
- `core/demo.py` — runnable sanity-check script
- `parsers/` — 6 raw-source parsers (NBER XLS, EIA XLS, BLS ZIP, Fed XML, ECB XML, NYFed PDF)
- `enrichment/` — deterministic rule-based enrichment pipeline (see below)
- `composer/` — news article composition with 3 provider modes (see below)
- `tests/` — 114 tests covering core, parsers, enrichment, and composer

What is **not** done yet:
- No FastAPI routes or runtime integration
- No frontend wiring

### Quick start

```bash
# Run the demo (from repo root)
python -m news_agent.core.demo

# Run all tests (from repo root)
python -m pytest news_agent/tests/ -v

# Re-run normalization parsers (writes to datasets/normalized/)
python -m news_agent.parsers.runner

# Re-run enrichment pipeline (writes to datasets/curated/historical_events_enriched.json)
python -m news_agent.enrichment.build_historical_events

# Run composer demo (template_only / mock / gemini)
python -m news_agent.composer.demo
python -m news_agent.composer.demo --mode mock
python -m news_agent.composer.demo --mode gemini   # requires GEMINI_API_KEY env var
```

## Enrichment Pipeline

The enrichment layer derives additional historical event records from
normalized source data using deterministic, auditable rules — no LLM calls,
no embeddings, no live network access.

### Flow

```
datasets/raw/        (6 original source files)
      ↓  parsers/
datasets/normalized/ (6 cleaned JSON files)
      ↓  enrichment/rules.py
datasets/curated/historical_events_enriched.json  (53 enriched events)
```

### Rules (in `enrichment/rules.py`)

| Rule | Source | Method | Events | Confidence |
|---|---|---|---|---|
| NBER recessions | `nber_cycles.json` | Post-1900 peak/trough cycles; severity scales with contraction length | 23 | high |
| EIA oil spikes | `eia_oil_prices.json` | 60-day rolling window, ≥40% price change, one per calendar year | 13 | medium |
| BLS inflation | `bls_cpi.json` | Month-over-month CPI-U change ≥1.0% | 3 | high |
| Fed FOMC | `fed_press.json` | Items with "FOMC statement" in title → policy_guidance_shift | 4 | medium |
| NYFed milestones | `nyfed_milestones.json` | All milestones promoted; category inferred by keyword matching | 10 | high |
| ECB policy | `ecb_media.json` | Strict keyword filter for "monetary policy" / "interest rate decision" | 0 | medium |

### Limitations & caveats

- **ECB**: The MID (Media Information Distribution) XML feed contains
  operational announcements (reference rates, publications), not actual
  monetary policy decisions. The strict filter correctly yields 0 events.
  A richer ECB source (press conferences, rate decision pages) would be
  needed to populate this category.
- **NYFed**: The PDF source was parsed into 10 curated milestones with
  placeholder dates. These are well-known public events, so
  `confidence=high` is appropriate, but exact dates may need verification.
- **Fed XML**: Only the most recent ~15 press releases are in the feed.
  Items are classified as `policy_guidance_shift` with `directional_impact=mixed`
  because the XML alone doesn't indicate hawkish vs. dovish stance.
- All enriched events carry `status="auto_enriched"`, which causes them to
  rank slightly below hand-curated `"ready_for_curation"` events in retrieval.

## Composer Layer

The composer generates news articles from simulation context using a
pluggable provider system.

### Provider modes

| Mode | Dependency | API key needed | Behaviour |
|---|---|---|---|
| `template_only` | none | no | Fills `{{placeholder}}` tokens in headline templates. Deterministic. Default. |
| `mock` | none | no | Returns canned `[MOCK]` articles. For testing only. |
| `gemini` | `google-generativeai` | `GEMINI_API_KEY` env var | Sends bounded prompt to Gemini 2.0 Flash, validates JSON response. Falls back to `template_only` on any failure. |

### Prompt safety

- Prompts contain ONLY: structured `SimulationContext`, top-3 retrieved historical events, and the template pattern.
- The system prompt explicitly forbids inventing numbers, institutions, dates, or market logic not in the context.
- Gemini output must be valid JSON with exactly `headline`, `body`, `beginner_explanation`.
- Output is validated for length bounds and structural integrity before returning.
- Any validation failure → automatic fallback to `template_only`.

### Setting up Gemini (optional)

```powershell
# Set the environment variable (Windows — persists across sessions)
setx GEMINI_API_KEY "PASTE_YOUR_NEW_KEY_HERE"
# Then restart your terminal / VS Code
```

## Folder Structure

```
news_agent/
  README.md              ← you are here
  requirements.txt       ← optional deps (google-generativeai)
  core/
    __init__.py
    models.py            ← dataclass types for all dataset records
    loader.py            ← JSON loading + validation (original + enriched)
    retrieval.py         ← deterministic event retrieval/ranking
    templates.py         ← headline template lookup with fallback
    demo.py              ← local sanity-check script
  composer/
    __init__.py
    models.py            ← SimulationContext + ComposedArticle
    providers.py         ← Provider ABC + factory (get_provider)
    template_provider.py ← deterministic template filler
    mock_provider.py     ← canned test responses
    gemini_provider.py   ← Google Gemini integration (optional)
    validation.py        ← article validation rules
    compose.py           ← main entry point (compose_article)
    demo.py              ← CLI demo script
  parsers/
    __init__.py
    runner.py            ← runs all 6 parsers, writes datasets/normalized/
    normalize_nber.py    ← NBER business-cycle XLS → JSON
    parse_eia_oil.py     ← EIA crude-oil-price XLS → JSON
    parse_bls_cpi.py     ← BLS CPI ZIP (CSV inside) → JSON
    parse_fed_xml.py     ← Fed press-release XML → JSON
    parse_ecb_xml.py     ← ECB media-info XML → JSON
    extract_nyfed_pdf.py ← NYFed crisis-timeline PDF → JSON (placeholder)
  enrichment/
    __init__.py
    rules.py             ← 6 deterministic rule functions
    build_historical_events.py  ← runs rules, writes enriched JSON
  datasets/
    README.md            ← dataset guide
    raw/                 ← original source files (Excel, XML, PDF, JSON)
      major/
      impactful/
      ordinary/
    normalized/          ← parser output (6 JSON files)
    curated/             ← ready-to-use JSON
      source_manifest.json
      event_taxonomy.json
      historical_events.json          ← 12 hand-curated events
      historical_events_enriched.json ← 53 auto-enriched events
      headline_templates.json
    scripts/
      README.md          ← future ingestion/validation scripts
  tests/
    __init__.py
    test_loader.py       ← loading + validation + error tests
    test_retrieval.py    ← retrieval + template lookup tests
    test_parsers.py      ← parser unit tests (23 tests)
    test_enrichment.py   ← enrichment rule + integration tests (26 tests)
    test_composer.py     ← composer + provider tests (36 tests)
```
