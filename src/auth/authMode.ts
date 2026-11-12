import type { Role, User } from './types';

/**
 * VITE_AUTH_ENABLED=false skips the login page and signs in a fixed local user (see
 * VITE_DEV_ROLE). Any other value, or unset, keeps the development login, as before.
 * Read when the dev server or build starts: restart `npm run dev` after changing it.
 */
export const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED !== 'false';

/** The user when sign-in is off. Role is trainee unless VITE_DEV_ROLE=admin. */
export function localUser(): User {
  const role: Role = import.meta.env.VITE_DEV_ROLE === 'admin' ? 'admin' : 'trainee';
  return { name: 'Local user', role };
}
