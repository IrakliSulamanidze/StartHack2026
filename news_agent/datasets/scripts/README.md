# Scripts — Future Ingestion & Validation Utilities

This directory will contain scripts that process raw source files into
curated event records. **No scripts are implemented yet** — this is a
scaffold for future work.

## Planned Scripts

| Script | Purpose |
|---|---|
| `normalize_nber.py` | Parse NBER business-cycle Excel/JSON into structured recession records |
| `parse_eia_oil.py` | Extract historical oil prices from EIA XLS; detect spike periods |
| `parse_fed_xml.py` | Parse Fed monetary-policy XML feed into rate-decision records |
| `parse_ecb_xml.py` | Parse ECB MID XML feed into rate-decision records |
| `parse_bls_cpi.py` | Extract CPI series from BLS archive; compute MoM/YoY changes |
| `extract_nyfed_pdf.py` | Extract crisis-timeline milestones from NY Fed PDF (may need manual steps) |
| `build_events.py` | Combine normalised source data into `historical_events.json` records |
| `validate_datasets.py` | Schema-check all curated JSON files against expected structure |

## Design Principles

- **Idempotent** — re-running a script produces the same output.
- **No runtime dependencies** — these are offline build-time tools.
- **Minimal libraries** — prefer stdlib (`json`, `csv`, `xml.etree`).
  Only add `openpyxl` or `pandas` if truly needed for Excel parsing.
- **Output to `curated/`** — scripts read from `raw/` and write to `curated/`.

## Running (future)

```bash
cd news_agent/datasets/scripts
python normalize_nber.py          # raw/major/nber_*.xlsx → temp JSON
python build_events.py            # combine all temp JSON → curated/historical_events.json
python validate_datasets.py       # check curated/ schema integrity
```
