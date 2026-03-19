/**
 * API Client — Wealth Manager Arena
 *
 * Typed wrappers for every backend endpoint the frontend needs.
 * All fetch calls go through this single file.
 *
 * Base URL is read from VITE_API_BASE_URL (defaults to http://localhost:8000).
 */

import type {
  BackendScenarioState,
  BackendScenarioCreateRequest,
  BackendTurnResult,
  BackendAdvanceRequest,
  BackendAllocateRequest,
  BackendDataSummary,
  BackendDataAsset,
} from '../types/backend';

const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? 'http://localhost:8000';

// ── Helpers ──

class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`API ${status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => res.statusText);
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<T>;
}

// ── Scenario endpoints ──

export function createScenario(params: BackendScenarioCreateRequest): Promise<BackendScenarioState> {
  return request<BackendScenarioState>('/scenario/create', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function getScenario(scenarioId: string): Promise<BackendScenarioState> {
  return request<BackendScenarioState>(`/scenario/${encodeURIComponent(scenarioId)}`);
}

export function advanceTurn(params: BackendAdvanceRequest): Promise<BackendTurnResult> {
  return request<BackendTurnResult>('/scenario/advance', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function allocate(params: BackendAllocateRequest): Promise<BackendScenarioState> {
  return request<BackendScenarioState>('/scenario/allocate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ── Data endpoints ──

export function getDataSummary(): Promise<BackendDataSummary> {
  return request<BackendDataSummary>('/data/summary');
}

export function getDataAssets(category?: string): Promise<BackendDataAsset[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  return request<BackendDataAsset[]>(`/data/assets${qs}`);
}

export { ApiError };
