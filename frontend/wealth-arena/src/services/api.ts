/**
 * API client — reused from old project, cleaned up.
 * All backend fetch calls go through this file.
 */

import type {
  BackendScenarioState,
  BackendScenarioCreateRequest,
  BackendTurnResult,
  BackendAdvanceRequest,
  BackendAllocateRequest,
  BackendDataSummary,
  BackendCalibrationStats,
} from '@/shared/types/backend';

const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? 'http://localhost:8000';

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
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => res.statusText);
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<T>;
}

// ── Scenario ──

export function createScenario(params: BackendScenarioCreateRequest): Promise<BackendScenarioState> {
  return request('/scenario/create', { method: 'POST', body: JSON.stringify(params) });
}

export function getScenario(id: string): Promise<BackendScenarioState> {
  return request(`/scenario/${encodeURIComponent(id)}`);
}

export function advanceTurn(params: BackendAdvanceRequest): Promise<BackendTurnResult> {
  return request('/scenario/advance', { method: 'POST', body: JSON.stringify(params) });
}

export function allocate(params: BackendAllocateRequest): Promise<BackendScenarioState> {
  return request('/scenario/allocate', { method: 'POST', body: JSON.stringify(params) });
}

// ── Data ──

export function getDataSummary(): Promise<BackendDataSummary> {
  return request('/data/summary');
}

export function getCalibration(): Promise<Record<string, BackendCalibrationStats>> {
  return request('/data/calibration');
}

export { ApiError };
