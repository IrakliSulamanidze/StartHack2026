import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import * as authService from '@/services/auth';
import type { UserProfile } from '@/services/auth';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => UserProfile;
  signup: (name: string, email: string, password: string) => UserProfile;
  logout: () => void;
  updateProfile: (updates: Partial<Pick<UserProfile, 'name' | 'email'>>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(authService.getStoredUser());
    setLoading(false);
  }, []);

  const login = useCallback((email: string, password: string) => {
    const u = authService.login(email, password);
    setUser(u);
    return u;
  }, []);

  const signup = useCallback((name: string, email: string, password: string) => {
    const u = authService.signup(name, email, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback((updates: Partial<Pick<UserProfile, 'name' | 'email'>>) => {
    const u = authService.updateProfile(updates);
    if (u) setUser(u);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
