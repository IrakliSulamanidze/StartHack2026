"""
Common types and helpers shared across all parsers.

Every parser outputs a list of NormalizedRecord dicts.  The schema is
intentionally kept as plain dicts (no dataclass) so the output is trivially
JSON-serialisable and decoupled from the curated-layer models.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

# Paths ----------------------------------------------------------------

_REPO_ROOT = Path(__file__).resolve().parent.parent          # news_agent/
_RAW_DIR = _REPO_ROOT / "datasets" / "raw"
_NORM_DIR = _REPO_ROOT / "datasets" / "normalized"

NormalizedRecord = Dict[str, Any]


def raw_path(*parts: str) -> Path:
    """Resolve a path relative to ``datasets/raw/``."""
    return _RAW_DIR.joinpath(*parts)


def norm_path(filename: str) -> Path:
    """Resolve a path relative to ``datasets/normalized/``."""
    return _NORM_DIR / filename


def write_normalized(
    source_id: str,
    records: List[NormalizedRecord],
    filename: str,
) -> Path:
    """Write normalised output JSON and return the path."""
    _NORM_DIR.mkdir(parents=True, exist_ok=True)
    out = norm_path(filename)
    payload = {
        "source_id": source_id,
        "normalized_at": datetime.now(timezone.utc).isoformat(),
        "record_count": len(records),
        "records": records,
    }
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return out
