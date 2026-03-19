"""
Placeholder parser for the NY Fed Financial Crisis Timeline PDF.

Input:  raw/major/nyfed_crisis_timeline.pdf
Output: normalized/nyfed_crisis_timeline.json

Full PDF text extraction is fragile and would require a heavy dependency
(e.g. pdfplumber, PyMuPDF).  Instead this module:

1. Verifies the PDF exists and records its size.
2. Outputs a placeholder JSON with hand-curated key milestones from the
   well-known GFC timeline (2007-2009).  These are public-knowledge dates
   that anyone studying the crisis would reference.

When a PDF parsing library is available, the placeholder records can be
replaced with extracted content.
"""

from __future__ import annotations

from typing import List

from .common import NormalizedRecord, raw_path, write_normalized

_SOURCE_ID = "nyfed_crisis_timeline"
_RAW_FILE = raw_path("major", "nyfed_crisis_timeline.pdf")
_OUT_FILE = "nyfed_crisis_timeline.json"

# Hand-curated GFC milestones (public knowledge).
# These can be replaced once proper PDF extraction is available.
_GFC_MILESTONES: List[NormalizedRecord] = [
    {
        "date": "2007-08-09",
        "title": "BNP Paribas freezes three investment funds",
        "significance": "First major signal of subprime contagion in Europe",
    },
    {
        "date": "2007-09-14",
        "title": "Northern Rock bank run",
        "significance": "First UK bank run in 150 years",
    },
    {
        "date": "2008-03-16",
        "title": "Bear Stearns acquired by JPMorgan Chase",
        "significance": "Fed-brokered emergency sale at $2/share",
    },
    {
        "date": "2008-09-07",
        "title": "Fannie Mae and Freddie Mac placed into conservatorship",
        "significance": "US government takes over mortgage giants",
    },
    {
        "date": "2008-09-15",
        "title": "Lehman Brothers files for bankruptcy",
        "significance": "Largest bankruptcy in US history; global panic trigger",
    },
    {
        "date": "2008-09-16",
        "title": "AIG receives $85 billion Fed bailout",
        "significance": "Systemic counterparty risk intervention",
    },
    {
        "date": "2008-10-03",
        "title": "Emergency Economic Stabilization Act signed (TARP)",
        "significance": "$700 billion Troubled Asset Relief Program enacted",
    },
    {
        "date": "2008-12-16",
        "title": "Fed cuts rates to 0-0.25% (zero lower bound)",
        "significance": "Federal funds rate reaches effective floor",
    },
    {
        "date": "2009-03-09",
        "title": "S&P 500 reaches crisis low at 676.53",
        "significance": "Market bottom; 57% decline from Oct 2007 peak",
    },
    {
        "date": "2009-06-01",
        "title": "NBER declares recession ended (retroactively June 2009)",
        "significance": "Official end date of the Great Recession",
    },
]


def parse() -> List[NormalizedRecord]:
    """Return placeholder GFC milestone records.

    Raises FileNotFoundError if the raw PDF is missing.
    """
    if not _RAW_FILE.exists():
        raise FileNotFoundError(f"Raw PDF not found: {_RAW_FILE}")
    return list(_GFC_MILESTONES)


def run() -> None:
    records = parse()
    pdf_size = _RAW_FILE.stat().st_size
    out = write_normalized(_SOURCE_ID, records, _OUT_FILE)
    print(
        f"[{_SOURCE_ID}] {len(records)} milestones (placeholder) → {out}"
        f"  [PDF on disk: {pdf_size:,} bytes]"
    )


if __name__ == "__main__":
    run()
