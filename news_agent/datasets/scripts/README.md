# Scripts — Ingestion & Validation Utilities

This directory is reserved for future standalone utility scripts.

Parsers have been implemented as a Python package at `news_agent/parsers/`.
See the section below for how they relate to the original plan.

## Implemented Parsers (in `news_agent/parsers/`)

| Module | Purpose | Status |
|---|---|---|
| `normalize_nber.py` | Parse NBER business-cycle XLSX into peak/trough records | ✅ Done |
| `parse_eia_oil.py` | Extract WTI daily spot prices from EIA XLS | ✅ Done |
| `parse_fed_xml.py` | Parse Fed monetary-policy RSS/XML into dated records | ✅ Done |
| `parse_ecb_xml.py` | Parse ECB MID RSS/XML into dated records | ✅ Done |
| `parse_bls_cpi.py` | Extract CPI-U monthly index from BLS ZIP; compute MoM/YoY | ✅ Done |
| `extract_nyfed_pdf.py` | Hand-curated GFC milestones (PDF extraction placeholder) | ✅ Placeholder |
| `normalize_all.py` | Run all parsers and write to `datasets/normalized/` | ✅ Done |

## Planned (not yet implemented)

| Script | Purpose |
|---|---|
| `build_events.py` | Combine normalised outputs into richer `historical_events.json` records |
| `validate_datasets.py` | Schema-check all curated JSON files against expected structure |

## Running

```bash
cd StartHack2026
python -m news_agent.parsers.normalize_all     # parse all → datasets/normalized/
python -m pytest news_agent/tests/ -v          # run all news_agent tests
```
