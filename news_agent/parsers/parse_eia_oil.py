"""
Parse EIA WTI crude oil daily spot prices from the XLS file.

Input:  raw/impactful/eia_oil_prices.xls
Output: normalized/eia_oil_prices.json

Each record is one trading day with date and price.
"""

from __future__ import annotations

from datetime import datetime
from typing import List

import xlrd

from .common import NormalizedRecord, raw_path, write_normalized

_SOURCE_ID = "eia_oil_prices"
_RAW_FILE = raw_path("impactful", "eia_oil_prices.xls")
_OUT_FILE = "eia_oil_prices.json"


def parse() -> List[NormalizedRecord]:
    """Return normalised daily oil price records."""
    wb = xlrd.open_workbook(str(_RAW_FILE))
    ws = wb.sheet_by_name("Data 1")

    records: List[NormalizedRecord] = []
    # Row 0-2 are headers.  Data starts at row 3.
    # Col 0 = Excel date serial, Col 1 = price (USD/bbl)
    for r in range(3, ws.nrows):
        serial = ws.cell_value(r, 0)
        price = ws.cell_value(r, 1)
        if not serial or not isinstance(price, (int, float)):
            continue
        date_tuple = xlrd.xldate_as_tuple(serial, wb.datemode)
        dt = datetime(*date_tuple[:3])
        records.append({
            "date": dt.strftime("%Y-%m-%d"),
            "price_usd": round(float(price), 2),
        })

    return records


def run() -> None:
    records = parse()
    out = write_normalized(_SOURCE_ID, records, _OUT_FILE)
    print(f"[{_SOURCE_ID}] {len(records)} daily prices → {out}")


if __name__ == "__main__":
    run()
