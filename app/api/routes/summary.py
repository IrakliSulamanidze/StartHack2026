from fastapi import APIRouter, HTTPException

from app.models.summary import (
    CoachHintRequest,
    CoachHintResponse,
    SummaryRequest,
    SummaryResponse,
)

router = APIRouter()


@router.post(
    "/generate",
    response_model=SummaryResponse,
    summary="Generate an end-of-game educational summary via LLM",
)
def generate_summary(request: SummaryRequest) -> SummaryResponse:
    """
    Use Claude to generate a personalised end-of-game summary.

    The LLM receives structured scoring data and returns:
    - A narrative summary of the game.
    - 3–5 personalised learning takeaways.
    - A behaviour profile label.
    - A challenge mission for the next replay.

    The LLM does NOT perform any financial calculations.
    All numeric inputs come from the deterministic scoring service.

    NOTE: Summary service is implemented in Phase 3.
    """
    raise HTTPException(
        status_code=501,
        detail="Summary service is not yet implemented. Coming in Phase 3.",
    )


@router.post(
    "/hint",
    response_model=CoachHintResponse,
    summary="Get an in-game coaching hint (AI Level 1 and 2 only)",
)
def get_coach_hint(request: CoachHintRequest) -> CoachHintResponse:
    """
    Use Claude to generate a contextual coaching hint for the current turn.

    Only used for AI Level 1 (Coach) and AI Level 2 (Analyst).
    AI Level 3 and ranked mode receive no hints.

    NOTE: Coach service is implemented in Phase 3.
    """
    if request.ai_level >= 3:
        raise HTTPException(
            status_code=400,
            detail="Hints are not available in AI Level 3 (Real Market) or ranked mode.",
        )
    raise HTTPException(
        status_code=501,
        detail="Coach service is not yet implemented. Coming in Phase 3.",
    )
