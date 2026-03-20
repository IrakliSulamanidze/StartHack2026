/**
 * Auth service — calls real backend API.
 * Falls back to localStorage if backend is unreachable.
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

const AUTH_KEY = 'lps_auth_user';
const TOKEN_KEY = 'lps_auth_token';
const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? `http://${window.location.hostname}:8000`;

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export async function login(email: string, password: string): Promise<UserProfile> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(body.detail || 'Invalid email or password');
  }

  const data = await res.json();
  const user: UserProfile = {
    id: data.user.id,
    name: data.user.name,
    email: data.user.email,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return user;
}

export async function signup(name: string, email: string, password: string): Promise<UserProfile> {
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: 'Signup failed' }));
    throw new Error(body.detail || 'Could not create account');
  }

  const data = await res.json();
  const user: UserProfile = {
    id: data.user.id,
    name: data.user.name,
    email: data.user.email,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return user;
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function updateProfile(updates: Partial<Pick<UserProfile, 'name' | 'email'>>): UserProfile | null {
  const user = getStoredUser();
  if (!user) return null;
  const updated = { ...user, ...updates };
  localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
  return updated;
}
