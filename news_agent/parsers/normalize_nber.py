"""
Parse NBER business-cycle peak/trough dates from the Excel file.

Input:  raw/major/nber_business_cycles.xlsx
Output: normalized/nber_business_cycles.json

Each record represents one business cycle with peak date, trough date,
and contraction duration derived from the month numbers in the spreadsheet.
"""

from __future__ import annotations

import re
from typing import List

import openpyxl

from .common import NormalizedRecord, raw_path, write_normalized

_SOURCE_ID = "nber_business_cycles"
_RAW_FILE = raw_path("major", "nber_business_cycles.xlsx")
_OUT_FILE = "nber_business_cycles.json"

# Month text looks like "June 1857 (1857Q2)" or "February 2020\xa0(2019Q4)"
_DATE_RE = re.compile(r"^(\w+)\s+(\d{4})")


def _parse_month_year(text: str | None) -> str | None:
    """Extract 'YYYY-MM' from cell text like 'June 1857 (1857Q2)'."""
    if not text:
        return None
    text = text.replace("\xa0", " ").strip()
    m = _DATE_RE.match(text)
    if not m:
        return None
    month_name, year = m.group(1), m.group(2)
    _MONTHS = {
        "January": "01", "February": "02", "March": "03", "April": "04",
        "May": "05", "June": "06", "July": "07", "August": "08",
        "September": "09", "October": "10", "November": "11", "December": "12",
    }
    mm = _MONTHS.get(month_name)
    if not mm:
        return None
    return f"{year}-{mm}"


def parse() -> List[NormalizedRecord]:
    """Return normalised NBER business-cycle records."""
    wb = openpyxl.load_workbook(_RAW_FILE, data_only=True)
    ws = wb.active

    records: List[NormalizedRecord] = []
    # Data rows start at row 4 (0-indexed row 3).  Columns (0-indexed):
    #   C (2) = peak month text
    #   D (3) = trough month text
    #   E (4) = peak month number
    #   F (5) = trough month number
    for row in ws.iter_rows(min_row=4, values_only=True):
        peak_text = row[2]
        trough_text = row[3]
        peak_num = row[4]
        trough_num = row[5]

        peak_date = _parse_month_year(str(peak_text)) if peak_text else None
        trough_date = _parse_month_year(str(trough_text)) if trough_text else None

        if not trough_date:
            continue  # skip summary/average rows

        contraction_months = None
        if peak_num and trough_num:
            try:
                contraction_months = int(float(trough_num)) - int(float(peak_num))
            except (ValueError, TypeError):
                pass

        records.append({
            "peak_date": peak_date,
            "trough_date": trough_date,
            "contraction_months": contraction_months,
            "peak_text": str(peak_text).replace("\xa0", " ").strip() if peak_text else None,
            "trough_text": str(trough_text).replace("\xa0", " ").strip() if trough_text else None,
        })

    wb.close()
    return records


def run() -> None:
    records = parse()
    out = write_normalized(_SOURCE_ID, records, _OUT_FILE)
    print(f"[{_SOURCE_ID}] {len(records)} cycles → {out}")


if __name__ == "__main__":
    run()
