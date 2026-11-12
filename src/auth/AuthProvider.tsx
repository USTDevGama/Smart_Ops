import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { devHeaders, loadDevUser, saveDevUser } from './devAuth';
import { AUTH_ENABLED, localUser } from './authMode';
import type { AuthProviderApi, Role, User } from './types';

const AuthContext = createContext<AuthProviderApi | null>(null);

/** Dev-login implementation. Replace with a Zitadel-backed one later (docs/auth-zitadel.md). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() =>
    AUTH_ENABLED ? loadDevUser() : localUser(),
  );

  const login = useCallback((name: string, role: Role) => {
    const next = { name: name.trim(), role };
    saveDevUser(next);
    setUser(next);
  }, []);

  // With sign-in off there is no login to return to, so sign out does nothing.
  const logout = useCallback(() => {
    if (!AUTH_ENABLED) return;
    saveDevUser(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthProviderApi>(
    () => ({ user, login, logout, getAuthHeaders: () => devHeaders(user) }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthProviderApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
