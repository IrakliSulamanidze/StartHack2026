# API Contract — Wealth Manager Arena

Base URL (local dev): `http://localhost:8000`

Interactive docs: `http://localhost:8000/docs` (Swagger UI)

All responses are JSON. All request bodies are JSON with `Content-Type: application/json`.

---

## Table of Contents

1. [Health Check](#health-check)
2. [POST /scenario/create](#post-scenariocreate)
3. [GET /scenario/{id}](#get-scenarioid)
4. [POST /scenario/advance](#post-scenarioadvance)
5. [GET /data/summary](#get-datasummary)
6. [GET /data/assets](#get-dataassets)
7. [GET /data/calibration](#get-datacalibration)
8. [GET /data/calibration/{symbol}](#get-datacalibrationsymbol)

---

## Health Check

### `GET /health`

Simple liveness probe.

**Response `200`**
```json
{ "status": "ok", "service": "Wealth Manager Arena API" }
```

---

## POST /scenario/create

Create a new game scenario. Everything is seeded and fully deterministic — the same request with the same `seed` always produces the same scenario.

### Request body

```json
{
  "game_mode":       "sandbox",
  "time_mode":       "monthly",
  "ai_level":        1,
  "difficulty":      "beginner",
  "asset_classes":   ["equities", "bonds", "gold"],
  "seed":            42,
  "num_turns":       null,
  "regime_override": null
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `game_mode` | string | ✅ | `"sandbox"` \| `"ranked"` \| `"battle"` \| `"event"` |
| `time_mode` | string | ✅ | `"monthly"` \| `"yearly"` |
| `ai_level` | int | ✅ | `1` = Coach (hints), `2` = Analyst, `3` = Real Market (no hints) |
| `difficulty` | string | ✅ | `"beginner"` \| `"intermediate"` \| `"advanced"` |
| `asset_classes` | string[] | ✅ | Any non-empty subset of `["equities","bonds","fx","gold","crypto"]` |
| `seed` | int \| null | ❌ | Omit for random; supply for replay/fairness |
| `num_turns` | int \| null | ❌ | Auto-calculated from difficulty+time_mode if null |
| `regime_override` | string \| null | ❌ | Force a specific regime (useful for testing) |

**Default turn counts:**

| difficulty | monthly | yearly |
|---|---|---|
| beginner | 24 | 10 |
| intermediate | 36 | 15 |
| advanced | 60 | 20 |

### Response `200` — `ScenarioState`

```json
{
  "scenario_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "regime_type": "bull_growth",
  "regime_label": "Bull Market – Growth Phase",
  "asset_classes": ["equities", "bonds", "gold"],
  "current_turn": 0,
  "num_turns": 24,
  "time_mode": "monthly",
  "seed": 42,
  "is_complete": false,
  "game_mode": "sandbox",
  "ai_level": 1,

  "asset_states": {
    "equities": {
      "asset_class": "equities",
      "symbol": "SMI",
      "name": "SMI Total Return",
      "current_price": 100.0,
      "price_history": [100.0],
      "cumulative_return_pct": 0.0,
      "turn_return_pct": 0.0,
      "is_in_shock": false
    }
  },

  "benchmark_state": {
    "label": "Balanced (60% equities / 40% bonds)",
    "current_value": 100.0,
    "value_history": [100.0],
    "cumulative_return_pct": 0.0
  },

  "selected_assets": {
    "equities": {
      "asset_class": "equities",
      "symbol": "SMI",
      "name": "SMI Total Return",
      "currency": "CHF",
      "annualized_vol_pct": 14.82,
      "avg_abs_daily_move_pct": 0.8912,
      "is_synthetic": false,
      "note": ""
    }
  },

  "benchmark_weights": {
    "equities": 0.631579,
    "bonds": 0.315789,
    "gold": 0.052632
  },

  "portfolios": {},

  "active_effects": [],

  "events": {
    "<event_id>": {
      "event_id": "<uuid>",
      "title": "Central Bank Rate Decision",
      "type": "central_bank_decision",
      "severity": "impactful",
      "affected_assets": ["equities", "bonds"],
      "impacts": [
        {
          "asset_class": "equities",
          "delta_pct": -1.5,
          "duration_turns": 2,
          "decay_factor": 0.5
        }
      ],
      "turn": 4,
      "description": "The central bank announces an unexpected rate hold..."
    }
  },

  "event_schedule": [
    { "turn": 4, "event_id": "<uuid>", "revealed": false }
  ],

  "news_history": {}
}
```

> `news_history` is a dict keyed by turn number (as a string in JSON). Each value is a `NewsArticle` (see [Advance response](#post-scenarioadvance)). Empty on creation; populated as turns are advanced. Narrative-only — does not affect prices or scoring.

### Error responses

| Status | Condition |
|---|---|
| `422` | Invalid `regime_override`, invalid enum value, missing required field |

### Frontend usage

- Call on "New Game" button press.
- Store `scenario_id` in local state — needed for all subsequent calls.
- Use `asset_states` to render starting chart (all at 100.0).
- Display `regime_label` as the scenario headline.
- Show `num_turns` as the game length indicator.

---

## GET /scenario/{id}

Fetch the full current state of a scenario at any time.

### Path parameter

| Param | Type | Notes |
|---|---|---|
| `id` | string (UUID) | The `scenario_id` returned by `/scenario/create` |

### Response `200`

Same shape as `ScenarioState` above — fully up to date with the latest turn.

### Error responses

| Status | Condition |
|---|---|
| `404` | Scenario ID not found |

### Frontend usage

- Use for page reload / reconnect after network drop.
- Use to sync state between teammates in battle mode.

---

## POST /scenario/advance

Advance the scenario by one turn. This is the main game loop endpoint.

Each call:
1. Applies the player's new allocations (or holds the current ones).
2. Runs the deterministic turn engine (price updates, event reveals, portfolio tracking).
3. Returns the full updated market state + portfolio result.

### Request body

```json
{
  "scenario_id":     "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "player_id":       "player1",
  "new_allocations": [
    { "asset_class": "equities", "weight": 0.6 },
    { "asset_class": "bonds",    "weight": 0.3 },
    { "asset_class": "gold",     "weight": 0.1 }
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `scenario_id` | string | ✅ | From `/scenario/create` |
| `player_id` | string | ✅ | Any identifier; use `"player1"` for single-player |
| `new_allocations` | Allocation[] \| null | ❌ | Omit to hold current weights. Weights must sum to 1.0. |

**Allocation object:**
```json
{ "asset_class": "equities", "weight": 0.6 }
```
Asset class must be one of the `asset_classes` in this scenario.

### Response `200` — `TurnResult`

```json
{
  "scenario_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "player_id": "player1",
  "turn_number": 1,

  "asset_states": {
    "equities": {
      "asset_class": "equities",
      "symbol": "SMI",
      "name": "SMI Total Return",
      "current_price": 101.83,
      "price_history": [100.0, 101.83],
      "cumulative_return_pct": 1.83,
      "turn_return_pct": 1.83,
      "is_in_shock": false
    }
  },

  "benchmark_state": {
    "label": "Balanced (60% equities / 40% bonds)",
    "current_value": 101.14,
    "value_history": [100.0, 101.14],
    "cumulative_return_pct": 1.14
  },

  "portfolio_value": 10183.0,
  "portfolio_return_this_turn_pct": 1.83,

  "events_this_turn": [],

  "is_game_over": false,

  "next_turn_preview": null,

  "news": {
    "headline": "Markets React to Central Bank Decision",
    "short_bulletin": "Interest rates held steady...",
    "beginner_explanation": "The central bank decided not to change rates...",
    "historical_example": null,
    "selected_event_ids": ["<event_id>"],
    "generation_mode": "template_only",
    "validation_flags": []
  }
}
```

> `news` is `null` when no events fired this turn or when the news generator is unavailable. It is narrative-only and does not affect deterministic price/scoring calculations. The same article is also persisted in the scenario's `news_history` (keyed by `turn_number`) so it survives page reloads via `GET /scenario/{id}`.

### Error responses

| Status | Condition |
|---|---|
| `400` | Game already complete; allocations don't sum to 1.0; unknown asset class in allocations |
| `404` | Scenario ID not found |

### Frontend usage

- Call when the player clicks "Next Turn" (after optionally adjusting sliders).
- Render `asset_states[*].current_price` as line chart data points.
- Show `events_this_turn` as a news feed / alert banner.
- Show `portfolio_value` vs `benchmark_state.current_value` comparison.
- When `is_game_over === true`, navigate to the results screen.
- First call with no `new_allocations` → equal-weight default applied automatically.

---

## GET /data/summary

High-level overview of all loaded market data. Useful for the asset browser / info screens.

### Response `200`

```json
{
  "total_assets": 62,
  "subcategories": {
    "equity_indices": 5,
    "bonds": 3,
    "fx": 2,
    "gold": 2,
    "djia_stocks": 30,
    "smi_stocks": 20
  },
  "date_range": {
    "earliest": "2006-01-02",
    "latest": "2026-01-30"
  }
}
```

### Frontend usage

- Info page / "About the Data" modal.
- Not needed during active gameplay.

---

## GET /data/assets

Full list of all 62 instruments in the registry. Returns metadata only — no price series.

### Query parameters

| Param | Type | Notes |
|---|---|---|
| `category` | string | Optional filter: `"equities"` \| `"bonds"` \| `"fx"` \| `"gold"` |
| `subcategory` | string | Optional filter: `"equity_indices"` \| `"djia_stocks"` \| `"smi_stocks"` \| etc. |

### Response `200`

```json
[
  {
    "symbol": "SMI",
    "name": "SMI Total Return",
    "category": "equities",
    "subcategory": "equity_indices",
    "currency": "CHF",
    "observation_count": 5000
  },
  {
    "symbol": "GOLD-CHF",
    "name": "Gold Price (CHF/oz)",
    "category": "gold",
    "subcategory": "gold",
    "currency": "CHF",
    "observation_count": 4800
  }
]
```

### Frontend usage

- Asset browser / "Learn about this asset" screen.
- Populate dropdown when letting players choose asset classes.

---

## GET /data/calibration

Calibration statistics for all instruments (annualised vol, total return, etc.).
Calculated from the raw CSV data — not invented.

### Response `200`

```json
[
  {
    "symbol": "SMI",
    "annualized_vol_pct": 14.82,
    "avg_abs_daily_move_pct": 0.891,
    "total_return_pct": 312.4,
    "min_daily_return_pct": -8.11,
    "max_daily_return_pct": 10.79,
    "observation_count": 5000
  }
]
```

### Frontend usage

- "Risk profile" display cards for each asset class.
- Show players which assets are more/less volatile before they pick.

---

## GET /data/calibration/{symbol}

Calibration statistics for one specific instrument.

### Path parameter

| Param | Type | Notes |
|---|---|---|
| `symbol` | string | e.g. `SMI`, `GOLD-CHF`, `USDCHF`, `CH-BOND-TR` |

### Response `200`

```json
{
  "symbol": "GOLD-CHF",
  "annualized_vol_pct": 13.45,
  "avg_abs_daily_move_pct": 0.764,
  "total_return_pct": 487.1,
  "min_daily_return_pct": -9.5,
  "max_daily_return_pct": 8.3,
  "observation_count": 4800
}
```

### Error responses

| Status | Condition |
|---|---|
| `404` | Symbol not found in registry |

### Frontend usage

- "Asset detail" modal / tooltip.

---

## Enum reference

### `game_mode`
| Value | Description |
|---|---|
| `sandbox` | Practice mode, no scoring |
| `ranked` | Scored against leaderboard |
| `battle` | Multi-player head-to-head |
| `event` | Pre-designed scenario (fixed regime + events) |

### `time_mode`
| Value | Description |
|---|---|
| `monthly` | Each turn = 1 month |
| `yearly` | Each turn = 1 year |

### `difficulty`
| Value | Typical regimes |
|---|---|
| `beginner` | Bull growth, post-crash recovery, commodity boom |
| `intermediate` | Rate hike cycle, inflation shock, recession, tech bubble |
| `advanced` | Stagflation, banking panic, geopolitical crisis |

### `asset_classes`
| Value | Example instrument selected |
|---|---|
| `equities` | SMI, DJIA, EUROSTOXX50, DAX, NIKKEI225 |
| `bonds` | CH-BOND-TR, GLOBAL-AGG-TR-CHF |
| `fx` | USDCHF, EURCHF |
| `gold` | GOLD-CHF, GOLD-USD |
| `crypto` | CRYPTO-SYNTH (synthetic — no CSV data) |

---

## Game loop (for frontend reference)

```
1. POST /scenario/create  → get scenario_id, initial state (all prices at 100)
2. Render charts, regime info, event count
3. Loop:
   a. Player adjusts allocation sliders
   b. POST /scenario/advance (with or without new_allocations)
   c. Render updated prices, portfolio value, events
   d. If is_game_over → show results
4. Optional: GET /scenario/{id} to restore state after reload
```

---

## Notes for frontend developers

- **All prices are indexed to 100.0 at game start.** You can always show percentage gain/loss as `current_price - 100`.
- **`price_history`** is the full array of prices indexed to 100 — ready to feed directly into a chart (`[100, 101.2, 99.8, ...]`).
- **`is_in_shock`** on an AssetState is `true` when an event hit that asset this turn with `|delta| > 3%` — use it to flash or highlight the asset in the UI.
- **`events_this_turn`** may be an empty array on most turns. Show it as a news ticker only when non-empty.
- **The first `POST /scenario/advance` with no `new_allocations`** gives the player equal-weight across all selected asset classes. No special handling needed.
- **`next_turn_preview`** is currently `null`. It will be populated by the LLM summary service for `ai_level` 1 and 2 in a future phase.
