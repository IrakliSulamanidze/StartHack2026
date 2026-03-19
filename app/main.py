from fastapi import FastAPI
from app.api.routes import scenario, portfolio, summary

app = FastAPI(
    title="Wealth Manager Arena API",
    description=(
        "Backend for Wealth Manager Arena — a gamified investing education platform. "
        "Simulation logic is fully deterministic. LLM is used only for summaries and hints."
    ),
    version="0.1.0",
)

app.include_router(scenario.router, prefix="/scenario", tags=["scenario"])
app.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
app.include_router(summary.router, prefix="/summary", tags=["summary"])


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "service": "Wealth Manager Arena API"}
