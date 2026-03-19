"""
Event Template Library — Wealth Manager Arena
===============================================
All event templates are STATIC configuration.
Impact ranges (delta_pct min/max) are bounded and deterministic.
The scenario service samples within these ranges using seeded RNG.

The LLM should NOT invent new event mechanics.
It may only enrich the 'description' text for educational wording.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Tuple

from app.core.constants import EventSeverity, EventType


@dataclass
class EventTemplate:
    """
    A template for one type of market event.

    impact_ranges:  {asset_class: (min_delta_pct, max_delta_pct, duration_turns)}
                    Positive = price increase; negative = price decrease.
    decay_factor:   How much the lingering impact shrinks each subsequent turn (0–1).
    """

    type: EventType
    severity: EventSeverity
    title: str
    description: str
    affected_assets: List[str]
    impact_ranges: Dict[str, Tuple[float, float, int]]
    decay_factor: float = 0.5


EVENT_TEMPLATES: List[EventTemplate] = [

    # -----------------------------------------------------------------------
    # CENTRAL BANK DECISIONS
    # -----------------------------------------------------------------------

    EventTemplate(
        type=EventType.CENTRAL_BANK_DECISION,
        severity=EventSeverity.IMPACTFUL,
        title="Central Bank Cuts Interest Rates",
        description=(
            "The central bank announces a surprise rate cut to stimulate the economy. "
            "Lower rates reduce borrowing costs, boosting equities and crypto."
        ),
        affected_assets=["equities", "bonds", "crypto"],
        impact_ranges={
            "equities": (1.5, 3.5, 2),
            "bonds":    (0.5, 2.0, 3),
            "crypto":   (2.0, 6.0, 1),
        },
        decay_factor=0.6,
    ),

    EventTemplate(
        type=EventType.CENTRAL_BANK_DECISION,
        severity=EventSeverity.IMPACTFUL,
        title="Central Bank Raises Interest Rates",
        description=(
            "Policymakers raise rates to combat rising inflation. "
            "Higher rates increase financing costs and compress valuations."
        ),
        affected_assets=["equities", "bonds", "crypto"],
        impact_ranges={
            "equities": (-3.0, -1.0, 2),
            "bonds":    (-2.5, -0.8, 3),
            "crypto":   (-8.0, -3.0, 1),
        },
        decay_factor=0.5,
    ),

    EventTemplate(
        type=EventType.CENTRAL_BANK_DECISION,
        severity=EventSeverity.ORDINARY,
        title="Central Bank Holds Rates Steady",
        description=(
            "The central bank votes to keep interest rates unchanged at current levels. "
            "Markets show minimal reaction."
        ),
        affected_assets=["bonds"],
        impact_ranges={
            "bonds": (-0.3, 0.3, 1),
        },
        decay_factor=0.3,
    ),

    # -----------------------------------------------------------------------
    # INFLATION SURPRISES
    # -----------------------------------------------------------------------

    EventTemplate(
        type=EventType.INFLATION_SURPRISE,
        severity=EventSeverity.IMPACTFUL,
        title="Inflation Surges Above Expectations",
        description=(
            "Consumer price index jumps significantly above analyst forecasts. "
            "Bonds sell off as real yields collapse. Gold becomes more attractive."
        ),
        affected_assets=["bonds", "equities", "gold"],
        impact_ranges={
            "bonds":    (-3.5, -1.5, 3),
            "equities": (-2.5, -0.5, 2),
            "gold":     (1.5, 4.0, 2),
        },
        decay_factor=0.6,
    ),

    EventTemplate(
        type=EventType.INFLATION_SURPRISE,
        severity=EventSeverity.IMPACTFUL,
        title="Inflation Cools More Than Expected",
        description=(
            "Inflation data comes in below expectations, signalling potential rate relief. "
            "Bonds rally. Equities recover. Pressure on crypto eases."
        ),
        affected_assets=["bonds", "equities", "crypto"],
        impact_ranges={
            "bonds":    (0.5, 2.0, 2),
            "equities": (0.5, 2.5, 2),
            "crypto":   (1.0, 4.0, 1),
        },
        decay_factor=0.5,
    ),

    # -----------------------------------------------------------------------
    # EARNINGS SHOCKS
    # -----------------------------------------------------------------------

    EventTemplate(
        type=EventType.EARNINGS_SHOCK,
        severity=EventSeverity.IMPACTFUL,
        title="Major Corporate Earnings Beat",
        description=(
            "Several large companies report results far exceeding analyst expectations. "
            "Investor confidence rises and equities rally."
        ),
        affected_assets=["equities"],
        impact_ranges={
            "equities": (2.0, 5.0, 1),
        },
        decay_factor=0.4,
    ),

    EventTemplate(
        type=EventType.EARNINGS_SHOCK,
        severity=EventSeverity.IMPACTFUL,
        title="Corporate Earnings Miss Expectations",
        description=(
            "Key market sectors report weaker-than-expected results. "
            "Revenue outlooks are revised downward, pressuring equity indices."
        ),
        affected_assets=["equities"],
        impact_ranges={
            "equities": (-5.0, -1.5, 2),
        },
        decay_factor=0.4,
    ),

    EventTemplate(
        type=EventType.EARNINGS_SHOCK,
        severity=EventSeverity.ORDINARY,
        title="Mixed Earnings Season Results",
        description=(
            "Corporate earnings season delivers mixed results. "
            "Some sectors beat, others miss — market reaction is muted."
        ),
        affected_assets=["equities"],
        impact_ranges={
            "equities": (-1.0, 1.0, 1),
        },
        decay_factor=0.3,
    ),

    # -----------------------------------------------------------------------
    # RECESSION WARNINGS
    # -----------------------------------------------------------------------

    EventTemplate(
        type=EventType.RECESSION_WARNING,
        severity=EventSeverity.MAJOR,
        title="Recession Warning: GDP Contracts",
        description=(
            "Official GDP data confirms two consecutive quarters of economic contraction. "
            "Equities sell off. Bonds rally as investors seek safety."
        ),
        affected_assets=["equities", "crypto", "bonds"],
        impact_ranges={
            "equities": (-8.0, -3.0, 3),
            "crypto":   (-12.0, -4.0, 2),
            "bonds":    (1.0, 3.0, 3),
        },
        decay_factor=0.5,
    ),

    EventTemplate(
        type=EventType.RECESSION_WARNING,
        severity=EventSeverity.IMPACTFUL,
        title="Leading Economic Indicators Turn Negative",
        description=(
            "A set of forward-looking economic indicators turns negative for the first time, "
            "raising recession fears among investors."
        ),
        affected_assets=["equities", "bonds"],
        impact_ranges={
            "equities": (-4.0, -1.5, 2),
            "bonds":    (0.5, 2.0, 2),
        },
        decay_factor=0.5,
    ),

    # -----------------------------------------------------------------------
    # BANKING STRESS
    # -----------------------------------------------------------------------

    EventTemplate(
        type=EventType.BANKING_STRESS,
        severity=EventSeverity.MAJOR,
        title="Banking Sector Under Severe Stress",
        description=(
            "Reports of liquidity issues at major banks trigger wide investor panic. "
            "Equities and crypto drop sharply. Gold surges as a safe haven."
        ),
        affected_assets=["equities", "crypto", "bonds", "gold"],
        impact_ranges={
            "equities": (-7.0, -3.0, 3),
            "crypto":   (-15.0, -5.0, 2),
            "bonds":    (-1.0, 2.0, 2),
            "gold":     (2.0, 5.0, 2),
        },
        decay_factor=0.6,
    ),

    EventTemplate(
        type=EventType.BANKING_STRESS,
        severity=EventSeverity.IMPACTFUL,
        title="Bank Bailout Announced",
        description=(
            "Authorities announce emergency support for struggling financial institutions. "
            "Markets partially recover but uncertainty remains."
        ),
        affected_assets=["equities", "bonds"],
        impact_ranges={
            "equities": (1.0, 4.0, 2),
            "bonds":    (0.5, 1.5, 1),
        },
        decay_factor=0.4,
    ),

    # -----------------------------------------------------------------------
    # GEOPOLITICAL ESCALATION
    # -----------------------------------------------------------------------

    EventTemplate(
        type=EventType.GEOPOLITICAL_ESCALATION,
        severity=EventSeverity.MAJOR,
        title="Geopolitical Escalation Rattles Markets",
        description=(
            "A major geopolitical conflict escalates unexpectedly, creating global uncertainty. "
            "Safe-haven assets benefit while risk assets sell off."
        ),
        affected_assets=["equities", "gold", "fx", "crypto"],
        impact_ranges={
            "equities": (-6.0, -2.0, 3),
            "gold":     (2.0, 5.5, 3),
            "fx":       (-2.0, 2.0, 2),
            "crypto":   (-10.0, -3.0, 2),
        },
        decay_factor=0.5,
    ),

    EventTemplate(
        type=EventType.GEOPOLITICAL_ESCALATION,
        severity=EventSeverity.IMPACTFUL,
        title="Sanctions Imposed on Major Economy",
        description=(
            "International sanctions are announced against a significant economy, "
            "disrupting commodity flows and raising risk premiums."
        ),
        affected_assets=["equities", "gold", "fx"],
        impact_ranges={
            "equities": (-3.5, -1.0, 2),
            "gold":     (1.0, 3.0, 2),
            "fx":       (-1.5, 1.5, 2),
        },
        decay_factor=0.5,
    ),

    # -----------------------------------------------------------------------
    # COMMODITY SUPPLY DISRUPTION
    # -----------------------------------------------------------------------

    EventTemplate(
        type=EventType.COMMODITY_SUPPLY_DISRUPTION,
        severity=EventSeverity.IMPACTFUL,
        title="Major Commodity Supply Disruption",
        description=(
            "Key commodity supply routes are disrupted, pushing prices sharply higher. "
            "Gold and energy-linked assets benefit. Input costs rise for equities."
        ),
        affected_assets=["gold", "equities", "bonds"],
        impact_ranges={
            "gold":     (1.5, 4.0, 3),
            "equities": (-2.0, 0.5, 2),
            "bonds":    (-1.0, 0.5, 1),
        },
        decay_factor=0.5,
    ),

    # -----------------------------------------------------------------------
    # REGULATORY ACTION
    # -----------------------------------------------------------------------

    EventTemplate(
        type=EventType.REGULATORY_ACTION,
        severity=EventSeverity.IMPACTFUL,
        title="Regulators Announce New Crypto Restrictions",
        description=(
            "Financial regulators in a major economy announce new restrictions on "
            "cryptocurrency trading and custody, causing a sharp selloff."
        ),
        affected_assets=["crypto", "equities"],
        impact_ranges={
            "crypto":   (-12.0, -4.0, 3),
            "equities": (-2.5, -0.5, 2),
        },
        decay_factor=0.4,
    ),

    EventTemplate(
        type=EventType.REGULATORY_ACTION,
        severity=EventSeverity.IMPACTFUL,
        title="New Financial Market Regulations Proposed",
        description=(
            "Regulators propose tighter rules for financial markets. "
            "Short-term uncertainty weighs on equities in affected sectors."
        ),
        affected_assets=["equities"],
        impact_ranges={
            "equities": (-3.0, -0.5, 2),
        },
        decay_factor=0.4,
    ),

    # -----------------------------------------------------------------------
    # CRYPTO SELLOFF
    # -----------------------------------------------------------------------

    EventTemplate(
        type=EventType.CRYPTO_SELLOFF,
        severity=EventSeverity.MAJOR,
        title="Crypto Market Flash Crash",
        description=(
            "A major crypto exchange reports operational issues, triggering a cascading "
            "market selloff. Retail and institutional investors rush for the exit."
        ),
        affected_assets=["crypto", "equities"],
        impact_ranges={
            "crypto":   (-25.0, -10.0, 2),
            "equities": (-3.0, -0.5, 1),
        },
        decay_factor=0.6,
    ),

    EventTemplate(
        type=EventType.CRYPTO_SELLOFF,
        severity=EventSeverity.IMPACTFUL,
        title="Major Crypto Project Collapses",
        description=(
            "A high-profile crypto project fails, destroying billions in market value "
            "and triggering contagion across the broader crypto market."
        ),
        affected_assets=["crypto"],
        impact_ranges={
            "crypto": (-18.0, -7.0, 2),
        },
        decay_factor=0.5,
    ),

    # -----------------------------------------------------------------------
    # RECOVERY SIGNALS
    # -----------------------------------------------------------------------

    EventTemplate(
        type=EventType.RECOVERY_SIGNAL,
        severity=EventSeverity.IMPACTFUL,
        title="Strong Economic Recovery Signals",
        description=(
            "Multiple economic indicators point to a stronger-than-expected recovery. "
            "Investor confidence rebounds. Equities and crypto rally."
        ),
        affected_assets=["equities", "crypto", "bonds"],
        impact_ranges={
            "equities": (2.0, 5.0, 2),
            "crypto":   (3.0, 8.0, 1),
            "bonds":    (-0.5, 0.5, 1),
        },
        decay_factor=0.5,
    ),

    EventTemplate(
        type=EventType.RECOVERY_SIGNAL,
        severity=EventSeverity.ORDINARY,
        title="Employment Data Surprises to the Upside",
        description=(
            "Monthly employment figures beat forecasts, signalling resilience in "
            "the labour market. Equities edge higher on the news."
        ),
        affected_assets=["equities"],
        impact_ranges={
            "equities": (0.5, 1.5, 1),
        },
        decay_factor=0.3,
    ),
]
