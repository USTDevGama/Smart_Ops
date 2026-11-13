import type { Role } from '../api/types';

/**
 * The single place the rest of this UI learns who is signed in and how to authenticate API calls.
 * The host portal owns sign-in (Zitadel); this UI never logs anyone in, stores a token or reads one.
 *
 * `src/index.tsx` calls `bindHost()` on every render with whatever `useHostAuth()` returned, so the
 * non-React API clients (HttpClient, MockClient) can read the current user and headers.
 */
export interface HostUser {
  name: string;
  role: Role;
}
export interface HostAuth {
  /** null = not signed in (the host normally prevents this from rendering at all). */
  user: HostUser | null;
  /** Headers for backend calls. Zitadel: { Authorization: 'Bearer <token>' }. */
  getAuthHeaders(): Record<string, string>;
}

let current: HostAuth = { user: null, getAuthHeaders: () => ({}) };
let onUnauthorized: () => void = () => {};

export function bindHost(auth: HostAuth) {
  current = auth;
}
export const getHostUser = () => current.user;
export const getAuthHeaders = () => current.getAuthHeaders();

/** The API client calls this on any 401 so the host can renew the token or send the person to sign in. */
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}
export const notifyUnauthorized = () => onUnauthorized();
