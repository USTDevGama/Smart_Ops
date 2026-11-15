import type { Role, User } from './types';

const KEY = 'main-ui.dev-user';

export function isRole(v: unknown): v is Role {
  return v === 'trainee' || v === 'admin';
}

export function loadDevUser(): User | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<User>;
    if (typeof parsed.name === 'string' && parsed.name && isRole(parsed.role)) {
      const traineeId =
        typeof parsed.traineeId === 'string' && parsed.traineeId ? parsed.traineeId : undefined;
      return { name: parsed.name, role: parsed.role, ...(traineeId && { traineeId }) };
    }
  } catch {
    /* storage unavailable or corrupt: treat as signed out */
  }
  return null;
}

export function saveDevUser(user: User | null): void {
  try {
    if (user) sessionStorage.setItem(KEY, JSON.stringify(user));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore: the in-memory state still works for this page load */
  }
}

/** Matches Smart_Ops_Pod3 `app/api/deps.py` dev auth. Only valid while the backend runs in local/dev. */
export function devHeaders(user: User | null): Record<string, string> {
  if (!user) return {};
  const headers: Record<string, string> = { 'X-Dev-User': user.name, 'X-Dev-Role': user.role };
  if (user.traineeId) headers['X-Dev-Trainee-Id'] = user.traineeId;
  return headers;
}
