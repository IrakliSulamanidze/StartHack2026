"""
CSV Loader — Wealth Manager Arena
===================================
Three loading strategies to handle the distinct CSV schemas in our dataset:

  1. load_timeseries_csv   — standard layout: unnamed date col + named value cols
                             Used for: Bonds, Equity Indices, FX, Gold
  2. load_single_stocks_csv — dual-header layout: row0=company names, row1=tickers
                             Used for: DJIA_Single Stocks, SMI_Single Stocks

All numeric parsing is tolerant of:
  - "#N/A", "N/A", empty strings  → None (observation skipped)
  - Leading/trailing whitespace
  - Thousands-separator commas: "  7,917.1 " → 7917.1
  - Inconsistent float formatting

Date format is DD/MM/YYYY (as present in all files) → normalised to YYYY-MM-DD.
"""

import csv
from pathlib import Path
from typing import Dict, List, Optional

from app.models.market_data import AssetRecord, PricePoint

# Values treated as missing/unavailable
_NA_MARKERS: frozenset = frozenset(
    {"#N/A", "#NA", "N/A", "NA", "", "-", "#VALUE!", "#REF!", "#NULL!"}
)


# ---------------------------------------------------------------------------
# Low-level parsing helpers
# ---------------------------------------------------------------------------

def _parse_price(raw: str) -> Optional[float]:
    """Return float or None for missing/invalid values."""
    s = raw.strip().replace(",", "").replace(" ", "")
    if s in _NA_MARKERS:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _parse_date(raw: str) -> Optional[str]:
    """Parse DD/MM/YYYY string → ISO YYYY-MM-DD. Returns None on any failure."""
    s = raw.strip()
    if not s:
        return None
    parts = s.split("/")
    if len(parts) != 3:
        return None
    d, m, y = parts
    try:
        int(d), int(m), int(y)
        return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
    except ValueError:
        return None


def _read_csv(filepath: Path) -> List[List[str]]:
    """Read all rows from a CSV, handling UTF-8 BOM and standard encodings."""
    if not filepath.exists():
        raise FileNotFoundError(
            f"Market data CSV not found: {filepath}\n"
            "Expected files at the workspace root. "
            "Rename to remove spaces in production (e.g. Market_Data_Bonds.csv)."
        )
    with open(filepath, encoding="utf-8-sig", newline="") as fh:
        return list(csv.reader(fh))


# ---------------------------------------------------------------------------
# Strategy 1: Standard timeseries
# ---------------------------------------------------------------------------

class TimeseriesColSpec:
    """Metadata for one column in a standard timeseries CSV."""
    __slots__ = ("col_idx", "symbol", "name", "category", "subcategory", "currency")

    def __init__(
        self,
        col_idx: int,
        symbol: str,
        name: str,
        category: str,
        subcategory: str,
        currency: str,
    ) -> None:
        self.col_idx = col_idx
        self.symbol = symbol
        self.name = name
        self.category = category
        self.subcategory = subcategory
        self.currency = currency


def load_timeseries_csv(
    filepath: Path,
    specs: List[TimeseriesColSpec],
    date_col: int = 0,
    skip_rows: int = 1,
) -> List[AssetRecord]:
    """
    Load a CSV where column `date_col` contains DD/MM/YYYY dates and
    all other columns specified in `specs` are numeric price/value series.

    skip_rows: number of header rows to skip (default 1).
    Rows where the date is unparseable are silently skipped.
    Rows where a value is #N/A or empty produce no PricePoint for that column.
    """
    rows = _read_csv(filepath)
    data_rows = rows[skip_rows:]

    # Pre-allocate one list per spec
    series_map: Dict[int, List[PricePoint]] = {s.col_idx: [] for s in specs}

    for row in data_rows:
        date = _parse_date(row[date_col]) if len(row) > date_col else None
        if date is None:
            continue
        for spec in specs:
            if len(row) > spec.col_idx:
                price = _parse_price(row[spec.col_idx])
                if price is not None:
                    series_map[spec.col_idx].append(PricePoint(date=date, price=price))

    return [
        AssetRecord(
            symbol=s.symbol,
            name=s.name,
            category=s.category,
            subcategory=s.subcategory,
            currency=s.currency,
            series=series_map[s.col_idx],
        )
        for s in specs
    ]


# ---------------------------------------------------------------------------
# Strategy 2: Dual-header single stocks
# ---------------------------------------------------------------------------

def load_single_stocks_csv(
    filepath: Path,
    category: str,
    subcategory: str,
    currency: str,
) -> List[AssetRecord]:
    """
    Load a DJIA/SMI-style CSV with this layout:
        Row 0: "Company"  | Company Name 1 | Company Name 2 | ...
        Row 1: "Ticker"   | TICKER-1       | TICKER-2       | ...
        Row 2+: DD/MM/YYYY | price1         | price2         | ...

    Assets with #N/A for all dates are still included (empty series) so
    the catalog is complete. A zero-length series signals no valid data.
    """
    rows = _read_csv(filepath)
    if len(rows) < 3:
        raise ValueError(
            f"Single stocks CSV {filepath.name} has fewer than 3 rows — "
            "expected company names, tickers, then price data."
        )

    company_row = rows[0]
    ticker_row = rows[1]
    data_rows = rows[2:]

    # Column 0 of each header row is the label ("Company" / "Ticker"), skip it
    company_names: List[str] = [c.strip() for c in company_row[1:]]
    tickers: List[str] = [t.strip() for t in ticker_row[1:]]
    n = min(len(company_names), len(tickers))

    series: List[List[PricePoint]] = [[] for _ in range(n)]

    for row in data_rows:
        date = _parse_date(row[0]) if row else None
        if date is None:
            continue
        for i in range(n):
            col = i + 1
            if len(row) > col:
                price = _parse_price(row[col])
                if price is not None:
                    series[i].append(PricePoint(date=date, price=price))

    return [
        AssetRecord(
            symbol=tickers[i],
            name=company_names[i],
            category=category,
            subcategory=subcategory,
            currency=currency,
            series=series[i],
        )
        for i in range(n)
    ]
