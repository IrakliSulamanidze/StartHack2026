from fastapi import APIRouter, HTTPException

from app.models.portfolio import Portfolio
from app.models.scoring import ScoringResult

router = APIRouter()


@router.post(
    "/evaluate",
    response_model=ScoringResult,
    summary="Evaluate a player's portfolio performance",
)
def evaluate_portfolio(portfolio: Portfolio) -> ScoringResult:
    """
    Calculate deterministic performance metrics for a player's portfolio.

    Metrics include: total return, volatility, max drawdown, diversification score,
    risk-match score, discipline score, reaction quality, overtrading penalty,
    resilience score, and benchmark comparison.

    NOTE: Scoring service is implemented in Phase 3.
    """
    raise HTTPException(
        status_code=501,
        detail="Scoring service is not yet implemented. Coming in Phase 3.",
    )
