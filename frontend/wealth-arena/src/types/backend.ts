/**
 * Backend response types — mirrors the Pydantic models from the backend.
 * These are READ-ONLY representations of what the API returns.
 * Existing frontend types in game.ts are NOT modified.
 */

// ── Enums (match backend string enums) ──

export type BackendGameMode = 'sandbox' | 'battle' | 'ranked' | 'event';
export type BackendTimeMode = 'monthly' | 'quarterly' | 'yearly';
export type BackendDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type BackendAssetClass = 'equities' | 'bonds' | 'fx' | 'gold' | 'crypto';
export type BackendEventSeverity = 'ordinary' | 'impactful' | 'major';

// ── Asset models ──

export interface BackendAssetState {
  asset_class: string;
  symbol: string | null;
  name: string | null;
  current_price: number;
  price_history: number[];
  cumulative_return_pct: number;
  turn_return_pct: number;
  is_in_shock: boolean;
}

export interface BackendBenchmarkState {
  label: string;
  current_value: number;
  value_history: number[];
  cumulative_return_pct: number;
}

export interface BackendSelectedAsset {
  asset_class: string;
  symbol: string;
  name: string;
  currency: string;
  annualized_vol_pct: number;
  avg_abs_daily_move_pct: number;
  is_synthetic: boolean;
  note: string;
}

// ── Event models ──

export interface BackendEventImpact {
  asset_class: string;
  delta_pct: number;
  duration_turns: number;
  decay_factor: number;
}

export interface BackendGameEvent {
  event_id: string;
  title: string;
  type: string;
  severity: BackendEventSeverity;
  affected_assets: string[];
  impacts: BackendEventImpact[];
  turn: number;
  description: string;
}

export interface BackendScheduledEvent {
  turn: number;
  event_id: string;
  revealed: boolean;
}

// ── Portfolio / Allocation ──

export interface BackendAllocation {
  asset_class: string;
  weight: number;
}

export interface BackendTrade {
  from_asset: string | null;
  to_asset: string;
  amount_pct: number;
}

export interface BackendPortfolio {
  player_id: string;
  scenario_id: string;
  initial_capital: number;
  cash: number;
  allocations: BackendAllocation[];
  trade_history: BackendTrade[];
  value_history: number[];
  current_value: number;
}

// ── Scenario State (response from POST /scenario/create and GET /scenario/{id}) ──

export interface BackendScenarioState {
  scenario_id: string;
  regime_type: string;
  regime_label: string;
  asset_classes: string[];
  current_turn: number;
  num_turns: number;
  time_mode: BackendTimeMode;
  seed: number;
  is_complete: boolean;
  game_mode: BackendGameMode;
  ai_level: number;
  asset_states: Record<string, BackendAssetState>;
  benchmark_state: BackendBenchmarkState;
  selected_assets: Record<string, BackendSelectedAsset>;
  benchmark_weights: Record<string, number>;
  portfolios: Record<string, BackendPortfolio>;
  active_effects: unknown[];
  events: Record<string, BackendGameEvent>;
  event_schedule: BackendScheduledEvent[];
}

// ── Turn Result (response from POST /scenario/advance) ──

export interface BackendTurnResult {
  scenario_id: string;
  player_id: string;
  turn_number: number;
  asset_states: Record<string, BackendAssetState>;
  benchmark_state: BackendBenchmarkState;
  portfolio_value: number;
  portfolio_return_this_turn_pct: number;
  portfolio_cash: number;
  events_this_turn: BackendGameEvent[];
  is_game_over: boolean;
  next_turn_preview: string | null;
}

// ── Scenario Create Request ──

export interface BackendScenarioCreateRequest {
  game_mode: BackendGameMode;
  time_mode: BackendTimeMode;
  ai_level: number;
  difficulty: BackendDifficulty;
  asset_classes: BackendAssetClass[];
  seed?: number | null;
  num_turns?: number | null;
  regime_override?: string | null;
}

// ── Advance Request ──

export interface BackendAdvanceRequest {
  scenario_id: string;
  player_id: string;
  new_allocations?: BackendAllocation[] | null;
}

// ── Allocate Request (set allocations without advancing turn) ──

export interface BackendAllocateRequest {
  scenario_id: string;
  player_id: string;
  allocations: BackendAllocation[];
}

// ── Data endpoints ──

export interface BackendDataSummary {
  total_assets: number;
  subcategories: Record<string, number>;
  date_range: {
    earliest: string;
    latest: string;
  };
}

export interface BackendDataAsset {
  symbol: string;
  name: string;
  category: string;
  subcategory: string;
  currency: string;
  observation_count: number;
}
