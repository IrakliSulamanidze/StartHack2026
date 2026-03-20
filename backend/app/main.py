from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import scenario, portfolio, summary, data
from app.api.routes import auth, party
from app.core.database import init_db

app = FastAPI(
    title="Wealth Manager Arena API",
    description=(
        "Backend for Wealth Manager Arena — a gamified investing education platform. "
        "Simulation logic is fully deterministic. LLM is used only for summaries and hints."
    ),
    version="0.1.0",
)

# CORS — allow all origins for local development and hackathon demo.
# Restrict `allow_origins` to your production domain before going live.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(party.router, prefix="/party", tags=["party"])
app.include_router(scenario.router, prefix="/scenario", tags=["scenario"])
app.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
app.include_router(summary.router, prefix="/summary", tags=["summary"])
app.include_router(data.router, prefix="/data", tags=["data"])


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "service": "Wealth Manager Arena API"}
