# Datasets — Guide

This directory holds the raw source material and curated JSON files that
power the news-agent narrative layer.

---

## Directory Layout

```
datasets/
  raw/              ← original downloaded files, untouched
    major/          ← sources for Major-class events
    impactful/      ← sources for Impactful-class events
    ordinary/       ← (mostly empty — ordinary news is template-based)
  curated/          ← cleaned, structured JSON ready for the agent
    source_manifest.json      ← registry of all sources
    event_taxonomy.json       ← news-type & category definitions
    historical_events.json    ← seed historical event records
    headline_templates.json   ← headline/body/explainer templates
  scripts/          ← future ingestion & validation utilities
    README.md
```

---

## What goes into `raw/`

Drop **original, unmodified** source files here — Excel workbooks, XML feeds,
PDFs, JSON dumps. Organise by news type:

| Subfolder | Example files |
|---|---|
| `raw/major/` | NBER business-cycle XLSX, NY Fed crisis timeline PDF |
| `raw/impactful/` | EIA oil prices XLS, Fed policy XML, BLS CPI ZIP |
| `raw/ordinary/` | (currently empty — ordinary news uses templates only) |

> **Do not edit raw files.** If you need a cleaned version, put it in
> `curated/` or write a transform script in `scripts/`.

---

## What goes into `curated/`

Structured, validated JSON files that are consumed directly by the news
agent at generation time. These are either hand-curated or produced by
scripts from `raw/` sources.

- **source_manifest.json** — one entry per data source with metadata,
  licensing, and local file path.
- **event_taxonomy.json** — defines news types (major / impactful /
  ordinary) and their sub-categories.
- **historical_events.json** — individual event records with structured
  fields (date, severity, affected assets, beginner explanation, …).
- **headline_templates.json** — parameterised headline, body, and
  explainer strings grouped by news type and category.

---

## What I need to add manually

The following files should be downloaded and placed into `raw/` by hand.
The `source_manifest.json` already has placeholder entries pointing to
the expected paths.

### 1. NBER Business Cycle Dates

- **What:** Excel or JSON file of US business-cycle peak/trough dates.
- **Where to get it:** <https://www.nber.org/research/data/us-business-cycle-expansions-and-contractions>
- **Place it at:** `raw/major/nber_business_cycles.xlsx`
  (or `.json` if you convert it — update the manifest accordingly)

### 2. EIA Petroleum Historical Prices

- **What:** Weekly/monthly crude oil spot prices (XLS workbook).
- **Where to get it:** <https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm> → download XLS
- **Place it at:** `raw/impactful/eia_oil_prices.xls`

### 3. Fed Monetary Policy Press Releases (XML)

- **What:** RSS/XML feed of FOMC press releases.
- **Where to get it:** <https://www.federalreserve.gov/feeds/press_monetary.xml>
- **Place it at:** `raw/impactful/fed_monetary_policy.xml`

### 4. ECB Monetary Policy Decisions (XML)

- **What:** ECB MID XML feed.
- **Where to get it:** <https://www.ecb.europa.eu/rss/press_monetarydecisions.xml>
- **Place it at:** `raw/impactful/ecb_mid_decisions.xml`

### 5. BLS CPI Archive

- **What:** Historical CPI data (annual archive ZIP or individual files).
- **Where to get it:** <https://www.bls.gov/cpi/data.htm>
- **Place it at:** `raw/impactful/bls_cpi_archive.zip`

### 6. NY Fed Financial Crisis Timeline

- **What:** PDF timeline of the 2007-09 financial crisis.
- **Where to get it:** <https://www.newyorkfed.org/research/global-economy/policyresponses.html>
- **Place it at:** `raw/major/nyfed_crisis_timeline.pdf`

### External-reference-only sources (do NOT download for runtime)

These sources are useful for research and manual curation but should
**not** be relied on at runtime or stored in the repo:

- **CFR Global Conflict Tracker** — <https://www.cfr.org/global-conflict-tracker>
- **IMF Commodity Data Portal** — <https://www.imf.org/en/Research/commodity-prices>

They are listed in `source_manifest.json` with `ingestion_mode: "external_reference"`.

---

## How this will be used later

1. **Ingestion scripts** (in `scripts/`) will parse raw files and append
   structured records to `historical_events.json`.
2. The **news agent** (future Python module) will, given a scenario's
   current regime and turn number, retrieve matching historical events
   and fill headline templates to produce news items.
3. The **backend** may expose these generated news items via an API
   endpoint; the **frontend** renders them in the News tab.

No live web calls are made at runtime — everything runs from local
curated JSON.
