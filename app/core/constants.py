from enum import Enum


class AssetClass(str, Enum):
    EQUITIES = "equities"
    BONDS = "bonds"
    FX = "fx"
    GOLD = "gold"
    CRYPTO = "crypto"


class RegimeType(str, Enum):
    BULL_GROWTH = "bull_growth"
    RECESSION = "recession"
    INFLATION_SHOCK = "inflation_shock"
    RATE_HIKE_CYCLE = "rate_hike_cycle"
    STAGFLATION = "stagflation"
    BANKING_PANIC = "banking_panic"
    COMMODITY_BOOM = "commodity_boom"
    GEOPOLITICAL_CRISIS = "geopolitical_crisis"
    POST_CRASH_RECOVERY = "post_crash_recovery"
    TECH_BUBBLE = "tech_bubble"


class EventType(str, Enum):
    CENTRAL_BANK_DECISION = "central_bank_decision"
    INFLATION_SURPRISE = "inflation_surprise"
    EARNINGS_SHOCK = "earnings_shock"
    RECESSION_WARNING = "recession_warning"
    BANKING_STRESS = "banking_stress"
    GEOPOLITICAL_ESCALATION = "geopolitical_escalation"
    COMMODITY_SUPPLY_DISRUPTION = "commodity_supply_disruption"
    REGULATORY_ACTION = "regulatory_action"
    CRYPTO_SELLOFF = "crypto_selloff"
    RECOVERY_SIGNAL = "recovery_signal"


class EventSeverity(str, Enum):
    ORDINARY = "ordinary"
    IMPACTFUL = "impactful"
    MAJOR = "major"


class GameMode(str, Enum):
    SANDBOX = "sandbox"
    BATTLE = "battle"
    RANKED = "ranked"


class TimeMode(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"


class Difficulty(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class VolatilityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EXTREME = "extreme"
