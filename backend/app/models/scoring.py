from pydantic import BaseModel


class ScoringResult(BaseModel):
    """
    Deterministic portfolio evaluation result.
    All metrics are calculated from price/portfolio history — no LLM involvement.
    """

    player_id: str
    scenario_id: str

    # Return metrics
    total_return_pct: float
    annualized_return_pct: float

    # Risk metrics
    volatility_pct: float
    max_drawdown_pct: float

    # Behavioural scores (0–100 scale, higher is better unless noted)
    diversification_score: float
    risk_match_score: float
    long_term_discipline_score: float
    reaction_quality_score: float
    # Higher = more penalised for overtrading
    overtrading_penalty: float
    resilience_score: float

    # Benchmark delta
    benchmark_comparison_pct: float

    # Composite score (0–100)
    overall_score: float

    # Plain-text label assigned by scoring rules (not by LLM)
    behavior_profile: str
