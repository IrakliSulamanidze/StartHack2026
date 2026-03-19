"""
Deterministic rules that derive historical-event candidates from normalised
source data.

Each rule function accepts a list of normalised records (plain dicts loaded
from ``datasets/normalized/*.json``) and returns a list of enriched-event
dicts ready for ``historical_events_enriched.json``.

Design constraints:
- No LLM / embedding / live-web calls.
- Conservative wording — never fabricate specific claims.
- Every record carries ``confidence``, ``derivation_method``, and
  ``source_refs`` so the provenance is transparent.
"""

from __future__ import annotations

from typing import Any, Dict, List

EnrichedEvent = Dict[str, Any]


# ── helpers ────────────────────────────────────────────────────────────────

def _eid(prefix: str, idx: int) -> str:
    """Generate a deterministic enriched event id."""
    return f"enriched_{prefix}_{idx:03d}"


# ── NBER business cycles ──────────────────────────────────────────────────

def nber_recession_events(records: List[dict]) -> List[EnrichedEvent]:
    """Derive recession_onset events from NBER peak/trough records.

    Only post-1900 cycles are included (earlier ones lack modern relevance).
    """
    events: List[EnrichedEvent] = []
    idx = 0
    for rec in records:
        peak = rec.get("peak_date")
        trough = rec.get("trough_date")
        if not peak or not trough:
            continue
        # Only modern cycles (post-1900)
        if peak < "1900":
            continue

        duration = rec.get("contraction_months")
        duration_str = f"{duration} months" if duration else "unknown duration"
        severity = _nber_severity(duration)

        idx += 1
        events.append({
            "event_id": _eid("nber", idx),
            "source_type": "nber_business_cycles",
            "source_refs": [f"peak={peak}, trough={trough}"],
            "news_type": "major",
            "category": "recession_onset",
            "title": f"US Recession: {peak} to {trough}",
            "date_label": peak,
            "region": "us",
            "severity": severity,
            "short_summary": (
                f"NBER-dated US recession from {rec.get('peak_text', peak)} "
                f"to {rec.get('trough_text', trough)} ({duration_str})."
            ),
            "affected_asset_classes": ["equities", "bonds"],
            "directional_impact": {
                "equities": "negative",
                "bonds": "positive",
            },
            "beginner_explanation": (
                "A recession means the economy shrank — businesses earned "
                "less and unemployment rose.  Stocks typically fall while "
                "bonds benefit from investors seeking safety."
            ),
            "retrieval_tags": _nber_tags(peak, trough, duration),
            "confidence": "high",
            "derivation_method": "nber_peak_trough_rule",
            "status": "auto_enriched",
        })
    return events


def _nber_severity(duration_months: int | None) -> int:
    if duration_months is None:
        return 3
    if duration_months >= 18:
        return 5
    if duration_months >= 12:
        return 4
    if duration_months >= 8:
        return 3
    return 2


def _nber_tags(peak: str, trough: str, duration: int | None) -> List[str]:
    tags = ["nber", "recession", "contraction"]
    if peak:
        tags.append(peak[:4])  # year
    if duration and duration >= 18:
        tags.append("severe_recession")
    return tags


# ── EIA oil price spikes ─────────────────────────────────────────────────

def eia_oil_spike_events(records: List[dict]) -> List[EnrichedEvent]:
    """Detect quarterly oil price spikes (>40% rise in a rolling 60-day window).

    Uses a conservative 40% threshold to avoid false positives from normal
    volatility.  Only looks at the most significant spike per calendar year
    to keep the dataset focused.
    """
    if len(records) < 60:
        return []

    # Build a date→price map
    prices = [(r["date"], r["price_usd"]) for r in records if r.get("price_usd")]

    # Find significant spikes: rolling 60-day look-back
    spikes_by_year: Dict[str, Dict] = {}
    for i in range(60, len(prices)):
        cur_date, cur_price = prices[i]
        lookback_price = prices[i - 60][1]
        if lookback_price <= 0:
            continue
        pct_change = (cur_price - lookback_price) / lookback_price * 100

        if pct_change >= 40:
            year = cur_date[:4]
            # Keep the largest spike per year
            if year not in spikes_by_year or pct_change > spikes_by_year[year]["pct"]:
                spikes_by_year[year] = {
                    "date": cur_date,
                    "price": cur_price,
                    "base_price": lookback_price,
                    "pct": round(pct_change, 1),
                }

    events: List[EnrichedEvent] = []
    for idx, (year, spike) in enumerate(sorted(spikes_by_year.items()), start=1):
        events.append({
            "event_id": _eid("eia", idx),
            "source_type": "eia_oil_prices",
            "source_refs": [
                f"date={spike['date']}, price=${spike['price']}, "
                f"60d_base=${spike['base_price']}, change={spike['pct']}%"
            ],
            "news_type": "impactful",
            "category": "oil_price_spike",
            "title": (
                f"Oil Price Spike: WTI rose ~{spike['pct']}% to "
                f"${spike['price']}/bbl by {spike['date']}"
            ),
            "date_label": spike["date"][:7],
            "region": "global",
            "severity": _oil_severity(spike["pct"]),
            "short_summary": (
                f"WTI crude rose approximately {spike['pct']}% over 60 "
                f"trading days, reaching ${spike['price']}/bbl on "
                f"{spike['date']}. (Base: ${spike['base_price']}/bbl.)"
            ),
            "affected_asset_classes": ["equities", "gold"],
            "directional_impact": {
                "equities": "negative",
                "gold": "positive",
            },
            "beginner_explanation": (
                "A sharp rise in oil prices increases costs for "
                "transportation, manufacturing, and heating.  This can "
                "hurt company profits and push consumer prices higher."
            ),
            "retrieval_tags": ["oil", "wti", "spike", year, "commodity_shock"],
            "confidence": "medium",
            "derivation_method": "eia_60day_spike_rule",
            "status": "auto_enriched",
        })
    return events


def _oil_severity(pct: float) -> int:
    if pct >= 100:
        return 5
    if pct >= 70:
        return 4
    if pct >= 50:
        return 3
    return 2


# ── BLS CPI inflation ────────────────────────────────────────────────────

def bls_inflation_events(records: List[dict]) -> List[EnrichedEvent]:
    """Flag months with notable MoM CPI acceleration (>= 1.0% MoM).

    The BLS archive only covers 2022, so this is a limited but real dataset.
    """
    events: List[EnrichedEvent] = []
    idx = 0
    for rec in records:
        mom = rec.get("mom_pct")
        if mom is None or mom < 1.0:
            continue

        idx += 1
        events.append({
            "event_id": _eid("bls", idx),
            "source_type": "bls_cpi_archive",
            "source_refs": [
                f"date={rec['date']}, cpi={rec['cpi_index']}, mom={mom}%"
            ],
            "news_type": "impactful",
            "category": "inflation_surprise",
            "title": (
                f"CPI-U Monthly Acceleration: {mom}% MoM in {rec['date']}"
            ),
            "date_label": rec["date"],
            "region": "us",
            "severity": _cpi_severity(mom),
            "short_summary": (
                f"The CPI-U All Items index rose {mom}% month-over-month "
                f"in {rec['date']} (index level: {rec['cpi_index']}). "
                f"This represents a notable acceleration in consumer prices."
            ),
            "affected_asset_classes": ["equities", "bonds", "gold"],
            "directional_impact": {
                "equities": "negative",
                "bonds": "negative",
                "gold": "mixed",
            },
            "beginner_explanation": (
                "When consumer prices rise faster than expected, it "
                "signals persistent inflation.  Markets react negatively "
                "because the central bank may need to raise rates further."
            ),
            "retrieval_tags": [
                "cpi", "inflation", rec["date"][:4], "bls", "price_surge"
            ],
            "confidence": "high",
            "derivation_method": "bls_mom_threshold_rule",
            "status": "auto_enriched",
        })
    return events


def _cpi_severity(mom: float) -> int:
    if mom >= 1.5:
        return 4
    if mom >= 1.0:
        return 3
    return 2


# ── Fed monetary-policy entries ──────────────────────────────────────────

def fed_policy_events(records: List[dict]) -> List[EnrichedEvent]:
    """Derive policy_guidance_shift events from FOMC statement entries.

    Only FOMC-statement items are promoted (not minutes or discount-rate
    releases).  Without the actual rate-change direction in the XML, we
    classify conservatively as ``policy_guidance_shift`` rather than guessing
    hawkish/dovish.
    """
    events: List[EnrichedEvent] = []
    idx = 0
    for rec in records:
        title = rec.get("title", "")
        # Only FOMC statements — the most market-moving items
        if "FOMC statement" not in title:
            continue

        idx += 1
        events.append({
            "event_id": _eid("fed", idx),
            "source_type": "fed_monetary_policy",
            "source_refs": [f"date={rec['date']}, title={title}"],
            "news_type": "impactful",
            "category": "policy_guidance_shift",
            "title": f"FOMC Statement Released — {rec['date']}",
            "date_label": rec["date"][:7],
            "region": "us",
            "severity": 3,
            "short_summary": (
                f"The Federal Reserve issued an FOMC statement on "
                f"{rec['date']}. The statement signals the committee's "
                f"current policy stance and forward guidance."
            ),
            "affected_asset_classes": ["equities", "bonds", "fx"],
            "directional_impact": {
                "equities": "mixed",
                "bonds": "mixed",
                "fx": "mixed",
            },
            "beginner_explanation": (
                "The FOMC statement tells markets whether the Fed plans "
                "to raise, lower, or hold interest rates.  Investors parse "
                "every word for clues about the economy's direction."
            ),
            "retrieval_tags": ["fomc", "fed", "statement", rec["date"][:4]],
            "confidence": "medium",
            "derivation_method": "fed_fomc_statement_rule",
            "status": "auto_enriched",
        })
    return events


# ── NYFed crisis milestones ──────────────────────────────────────────────

_NYFED_CATEGORY_MAP = {
    "BNP Paribas": "banking_panic",
    "Northern Rock": "banking_panic",
    "Bear Stearns": "banking_panic",
    "Fannie Mae": "emergency_policy_intervention",
    "Lehman Brothers": "banking_panic",
    "AIG": "emergency_policy_intervention",
    "TARP": "emergency_policy_intervention",
    "Fed cuts rates": "emergency_policy_intervention",
    "S&P 500 reaches crisis low": "global_crash",
    "NBER declares recession ended": "recession_onset",
}


def nyfed_crisis_events(records: List[dict]) -> List[EnrichedEvent]:
    """Promote NYFed crisis-timeline milestones to enriched events.

    Category is assigned via keyword matching against milestone titles.
    These are hand-curated placeholders from the PDF metadata, so
    confidence is ``high`` (the facts are well-known public history).
    """
    events: List[EnrichedEvent] = []
    for idx, rec in enumerate(records, start=1):
        title = rec.get("title", "")
        category = _classify_nyfed(title)
        events.append({
            "event_id": _eid("nyfed", idx),
            "source_type": "nyfed_crisis_timeline",
            "source_refs": [f"date={rec['date']}, title={title}"],
            "news_type": "major",
            "category": category,
            "title": title,
            "date_label": rec["date"][:7],
            "region": "us" if "Europe" not in rec.get("significance", "") else "eu",
            "severity": 4,
            "short_summary": (
                f"{title}. {rec.get('significance', '')} "
                f"(Source: NY Fed Financial Crisis Timeline)"
            ),
            "affected_asset_classes": ["equities", "bonds"],
            "directional_impact": {
                "equities": "strongly_negative",
                "bonds": "flight_to_safety",
            },
            "beginner_explanation": (
                "This was a key moment during the 2007-2009 financial "
                "crisis.  Events like bank failures and emergency "
                "government actions shook confidence worldwide."
            ),
            "retrieval_tags": [
                "gfc", "2008", "crisis", rec["date"][:4],
                category.replace("_", " "),
            ],
            "confidence": "high",
            "derivation_method": "nyfed_milestone_promotion",
            "status": "auto_enriched",
        })
    return events


def _classify_nyfed(title: str) -> str:
    """Classify a NYFed milestone title into a taxonomy category."""
    for keyword, cat in _NYFED_CATEGORY_MAP.items():
        if keyword in title:
            return cat
    return "global_crash"  # safe default for GFC events


# ── ECB (limited) ────────────────────────────────────────────────────────

def ecb_policy_events(records: List[dict]) -> List[EnrichedEvent]:
    """Extract ECB items only if they are clearly policy-relevant.

    The ECB MID feed is mostly operational status messages (T2S, TIPS, ECMS).
    Only items containing 'rate', 'monetary policy', or 'decision' in the
    title are promoted.  This typically yields zero events from the current
    feed snapshot — which is the honest outcome.
    """
    _POLICY_KEYWORDS = {"monetary policy", "interest rate decision", "rate decision"}
    # Operational / data-publication items to exclude even if keywords match
    _EXCLUDE_KEYWORDS = {
        "reference rate", "publication message", "short-term-rate",
        "operating normally", "is closed", "allotment", "announcement",
        "eligible marketable", "liquidity management",
    }
    events: List[EnrichedEvent] = []
    idx = 0
    for rec in records:
        title_lower = rec.get("title", "").lower()
        if any(ex in title_lower for ex in _EXCLUDE_KEYWORDS):
            continue
        if not any(kw in title_lower for kw in _POLICY_KEYWORDS):
            continue

        idx += 1
        events.append({
            "event_id": _eid("ecb", idx),
            "source_type": "ecb_mid_decisions",
            "source_refs": [f"date={rec['date']}, title={rec['title']}"],
            "news_type": "impactful",
            "category": "policy_guidance_shift",
            "title": f"ECB Policy Signal: {rec['title']}",
            "date_label": rec["date"][:7],
            "region": "eu",
            "severity": 3,
            "short_summary": (
                f"ECB MID feed item dated {rec['date']}: {rec['title']}. "
                f"This may indicate a policy-relevant communication."
            ),
            "affected_asset_classes": ["equities", "bonds", "fx"],
            "directional_impact": {
                "equities": "mixed",
                "bonds": "mixed",
                "fx": "mixed",
            },
            "beginner_explanation": (
                "The European Central Bank influences interest rates "
                "across Europe.  Changes in ECB policy affect the euro, "
                "European stocks, and global bond markets."
            ),
            "retrieval_tags": ["ecb", "europe", rec["date"][:4], "policy"],
            "confidence": "low",
            "derivation_method": "ecb_keyword_filter_rule",
            "status": "auto_enriched",
        })
    return events
