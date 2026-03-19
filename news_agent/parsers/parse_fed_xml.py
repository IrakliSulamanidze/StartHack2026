"""
Parse Federal Reserve monetary-policy RSS/XML feed.

Input:  raw/impactful/fed_monetary_policy.xml
Output: normalized/fed_monetary_policy.json

Each record is one RSS item (FOMC statement, minutes release, etc.).
"""

from __future__ import annotations

import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from typing import List

from .common import NormalizedRecord, raw_path, write_normalized

_SOURCE_ID = "fed_monetary_policy"
_RAW_FILE = raw_path("impactful", "fed_monetary_policy.xml")
_OUT_FILE = "fed_monetary_policy.json"


def parse() -> List[NormalizedRecord]:
    """Return normalised Fed monetary-policy records."""
    tree = ET.parse(_RAW_FILE)
    channel = tree.getroot().find("channel")
    if channel is None:
        return []

    records: List[NormalizedRecord] = []
    for item in channel.findall("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub_date_raw = (item.findtext("pubDate") or "").strip()
        description = (item.findtext("description") or "").strip()
        category = (item.findtext("category") or "").strip()

        # Parse RFC-2822 date → ISO-8601
        iso_date = ""
        if pub_date_raw:
            try:
                dt = parsedate_to_datetime(pub_date_raw)
                iso_date = dt.date().isoformat()
            except (ValueError, TypeError):
                iso_date = pub_date_raw

        records.append({
            "date": iso_date,
            "title": title,
            "description": description,
            "category": category,
            "link": link,
        })

    # Sort newest-first for consistency
    records.sort(key=lambda r: r["date"], reverse=True)
    return records


def run() -> None:
    records = parse()
    out = write_normalized(_SOURCE_ID, records, _OUT_FILE)
    print(f"[{_SOURCE_ID}] {len(records)} items → {out}")


if __name__ == "__main__":
    run()
