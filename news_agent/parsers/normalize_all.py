"""
Run all raw-source parsers and write normalized JSON outputs.

Usage:
    python -m news_agent.parsers.normalize_all
"""

from __future__ import annotations

import sys
import traceback

from . import (
    normalize_nber,
    parse_eia_oil,
    parse_fed_xml,
    parse_ecb_xml,
    parse_bls_cpi,
    extract_nyfed_pdf,
)

_PARSERS = [
    ("nber_business_cycles", normalize_nber),
    ("eia_oil_prices", parse_eia_oil),
    ("fed_monetary_policy", parse_fed_xml),
    ("ecb_mid_decisions", parse_ecb_xml),
    ("bls_cpi_archive", parse_bls_cpi),
    ("nyfed_crisis_timeline", extract_nyfed_pdf),
]


def main() -> None:
    print("=== news_agent normalization pipeline ===\n")
    ok = 0
    fail = 0
    for name, module in _PARSERS:
        try:
            module.run()
            ok += 1
        except Exception:
            print(f"[{name}] FAILED:")
            traceback.print_exc()
            fail += 1
            print()

    print(f"\nDone: {ok} succeeded, {fail} failed.")
    if fail:
        sys.exit(1)


if __name__ == "__main__":
    main()
