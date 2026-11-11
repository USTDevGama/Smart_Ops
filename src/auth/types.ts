export type Role = 'trainee' | 'admin';

export type User = { name: string; role: Role };

/**
 * The only surface the rest of the app (shell and agents) knows about.
 * Swapping dev login for Zitadel means providing a new implementation of this
 * interface (see zitadelAuth.ts and docs/auth-zitadel.md). Nothing else changes.
 */
export interface AuthProviderApi {
  /** Current user, or null when signed out. */
  user: User | null;
  /** Dev login only. Zitadel will redirect to the identity provider instead. */
  login(name: string, role: Role): void;
  logout(): void;
  /** Headers to attach to backend requests. Dev: X-Dev-User / X-Dev-Role. Zitadel: Authorization: Bearer. */
  getAuthHeaders(): Record<string, string>;
}
