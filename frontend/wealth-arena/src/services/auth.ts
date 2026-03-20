/**
 * Local auth service — playtoy/localStorage-based.
 * Designed so it can later be swapped with real backend auth.
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

const AUTH_KEY = 'lps_auth_user';

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function login(email: string, _password: string): UserProfile {
  // In real implementation, this would call backend auth API
  const existing = getAllUsers().find(u => u.email === email);
  if (existing) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(existing));
    return existing;
  }
  // Auto-create for demo
  const user: UserProfile = {
    id: crypto.randomUUID(),
    name: email.split('@')[0],
    email,
    createdAt: new Date().toISOString(),
  };
  saveUserToRegistry(user);
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return user;
}

export function signup(name: string, email: string, _password: string): UserProfile {
  const user: UserProfile = {
    id: crypto.randomUUID(),
    name,
    email,
    createdAt: new Date().toISOString(),
  };
  saveUserToRegistry(user);
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return user;
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function updateProfile(updates: Partial<Pick<UserProfile, 'name' | 'email'>>): UserProfile | null {
  const user = getStoredUser();
  if (!user) return null;
  const updated = { ...user, ...updates };
  localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
  saveUserToRegistry(updated);
  return updated;
}

// Simple user registry for demo
function getAllUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem('lps_user_registry');
    return raw ? (JSON.parse(raw) as UserProfile[]) : [];
  } catch {
    return [];
  }
}

function saveUserToRegistry(user: UserProfile): void {
  const users = getAllUsers().filter(u => u.id !== user.id);
  users.push(user);
  localStorage.setItem('lps_user_registry', JSON.stringify(users));
}
