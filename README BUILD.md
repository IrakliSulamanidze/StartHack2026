# Wealth Manager Arena — Build Instructions for Claude

## Purpose
This repository contains the concept for **Wealth Manager Arena**, a beginner-first investing simulation game.

Your job is to help build the MVP of this product as an engineering assistant.

You should use this file, `README GAME.md`, and `README BUSINESS.md` as the main source of truth.

---

## Product Summary
Wealth Manager Arena is a gamified investing education platform for beginners.

Users build portfolios using different asset classes, experience accelerated market time, react to news and crises, and receive educational feedback based on their decisions.

The platform must support:
- solo sandbox learning
- competitive / battle mode
- AI assistance levels
- realistic but simplified market behavior
- summary and coaching functions
- replayable scenario generation

This is **not** a trading platform and **not** a gambling-style stock game.

The product should reward:
- diversification
- long-term thinking
- disciplined investing
- risk awareness
- appropriate reaction to market conditions

---

## Core Build Goal
Build an MVP backend and product structure for a web app that can:

1. generate investing game scenarios,
2. simulate asset behavior across turns,
3. create news/events,
4. evaluate player portfolio decisions,
5. generate educational summaries and hints.

---

## Most Important Rule
Do **not** make the LLM invent raw financial truth freely.

The system must use:

- deterministic or semi-deterministic scenario logic,
- structured market regime templates,
- bounded randomness,
- asset-specific behavior rules,
- explicit scoring logic.

The LLM should mainly be used for:
- event narration,
- beginner-friendly explanations,
- educational summaries,
- coach hints,
- portfolio feedback wording.

The LLM should **not** be the source of truth for:
- exact price paths,
- return calculations,
- volatility math,
- drawdown computation,
- benchmark construction,
- core scoring logic.

---

## Technical Objective
Build a **Python FastAPI backend** that exposes APIs for a frontend game.

Suggested architecture:
- `app/main.py`
- `app/api/routes/`
- `app/models/`
- `app/services/`
- `app/core/`
- `tests/`

Use:
- Python
- FastAPI
- Pydantic
- modular service structure
- clear typed schemas
- JSON-first API design

---

## MVP Functional Scope

### 1. Scenario Generation
The backend must generate a scenario based on:
- selected asset classes
- game mode
- difficulty
- time mode
- AI level
- market regime
- random seed

Scenario output should include:
- scenario id
- regime type
- asset universe
- benchmark
- event schedule
- number of turns
- hidden metadata for simulation
- initial market state

---

### 2. Market Regime System
Create a regime library with realistic high-level templates such as:
- bull growth
- recession
- inflation shock
- rate hike cycle
- stagflation
- banking panic
- commodity boom
- geopolitical crisis
- post-crash recovery
- tech bubble

Each regime should define:
- expected behavior by asset class
- volatility level
- typical event types
- correlation tendencies
- shock probability
- return range tendencies

---

### 3. Asset Classes
Support these asset classes in the MVP:
- equities
- bonds
- FX
- gold / commodities
- crypto

Each asset class must have its own behavior profile.

Examples:
- crypto should be more volatile than bonds
- FX should usually move less than crypto
- bonds should react differently in inflation shock vs recession
- gold can act as a defensive asset in uncertainty scenarios
- equities should support sector/regime sensitivity

---

### 4. Event Generation
Generate events that affect markets in a structured way.

Event types may include:
- central bank decision
- inflation surprise
- earnings shock
- recession warning
- banking stress
- war / geopolitical escalation
- commodity supply disruption
- regulatory action
- crypto selloff
- recovery signal

Each event should include:
- event id
- title
- type
- severity
- affected assets
- duration
- market effect parameters
- readable explanation

Use structured logic for impact.
Use the LLM only to make the wording more natural and educational.

---

### 5. Turn Progression
Each turn should:
- apply the next time step,
- apply event impacts if relevant,
- update asset performance,
- update portfolio value,
- update benchmarks,
- return state for frontend rendering.

Support:
- monthly mode
- yearly mode

---

### 6. Portfolio Evaluation
Evaluate player decisions using educational metrics, not just profit.

Core metrics:
- total return
- volatility
- maximum drawdown
- diversification score
- risk-match score
- overtrading / timing penalty
- resilience score
- benchmark comparison
- long-term discipline score
- reaction quality to news

These metrics must be coded deterministically where possible.

---

### 7. Summary / Coach Layer
Use Claude for:
- end-of-turn summary
- end-of-game summary
- educational portfolio feedback
- coach hints for beginner modes
- “what you learned” personalized takeaway list

Claude should receive structured input from the backend and produce concise, readable output.

---

## API Requirements
Create endpoints such as:

- `POST /scenario/create`
- `POST /scenario/advance`
- `POST /portfolio/evaluate`
- `POST /summary/generate`
- `POST /coach/hint`

Responses must be frontend-friendly JSON.

---

## Data Design Requirements
Define clear Pydantic models for:
- scenario config
- scenario state
- regime template
- asset state
- event
- portfolio
- benchmark
- turn result
- scoring result
- summary request / response

All schemas should be typed and consistent.

---

## Guardrails
Do not build this as an unconstrained autonomous finance agent.

Do not:
- fabricate financial logic freely,
- let text generation decide market math,
- mix narration logic with core simulation logic,
- overcomplicate the first MVP.

Do:
- separate simulation logic from narrative logic,
- keep functions modular,
- make outputs predictable and testable,
- design for future extension.

---

## Preferred Build Strategy
Build the system in this order:

### Phase 1
- project structure
- schemas
- regime library
- scenario seed generator

### Phase 2
- turn engine
- event engine
- asset behavior logic
- benchmark logic

### Phase 3
- portfolio evaluation
- scoring service
- summary service
- coach service

### Phase 4
- API routes
- example requests/responses
- tests
- developer notes

---

## What I Want Claude To Do
When generating code for this repository:

1. first propose the architecture,
2. then scaffold the files,
3. then implement core models,
4. then implement services step by step,
5. then connect the API,
6. then add tests,
7. then suggest next improvements.

Do not dump everything at once without structure.

Explain assumptions clearly.

If something is underspecified, choose the most reasonable MVP-friendly solution and state it.

---

## First Coding Task
Start by generating:

- folder structure,
- `app/main.py`,
- base Pydantic models,
- regime library,
- scenario config schema,
- scenario creation endpoint,
- simple deterministic scenario engine skeleton.

After that, continue iteratively.

---

## Coding Style
- clean and modular
- strongly typed
- readable names
- production-style structure
- minimal but extensible
- no unnecessary abstraction
- clear comments only where useful

---

## Final Instruction
Treat this repository as a serious MVP build for a hackathon prototype that could later become a real product.

Optimize for:
- realism,
- clarity,
- extensibility,
- educational usefulness,
- low hallucination risk,
- fast implementation.
