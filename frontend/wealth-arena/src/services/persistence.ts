/**
 * Persistence service — localStorage wrapper.
 * Designed to be swapped with backend persistence later.
 */

const PREFIX = 'lps_';

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}

export function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function remove(key: string): void {
  localStorage.removeItem(PREFIX + key);
}

// ── Typed convenience functions ──

export function saveDailyStreak(streak: number): void {
  save('daily_streak', streak);
}

export function loadDailyStreak(): number {
  return load<number>('daily_streak') ?? 0;
}

export function saveDailyResult(result: unknown): void {
  save('daily_result', result);
}

export function loadDailyResult<T>(): T | null {
  return load<T>('daily_result');
}

export function saveSandboxState(state: unknown): void {
  save('sandbox_state', state);
}

export function loadSandboxState<T>(): T | null {
  return load<T>('sandbox_state');
}

export function clearSandboxState(): void {
  remove('sandbox_state');
}

export function saveProfileStats(stats: unknown): void {
  save('profile_stats', stats);
}

export function loadProfileStats<T>(): T | null {
  return load<T>('profile_stats');
}
