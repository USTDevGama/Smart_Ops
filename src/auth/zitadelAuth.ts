/**
 * Zitadel integration: NOT IMPLEMENTED YET. This file documents the seam.
 *
 * Plan (details in docs/auth-zitadel.md):
 *  1. Use OIDC authorization code + PKCE (e.g. `oidc-client-ts`) against the Zitadel issuer.
 *  2. Read the role ('trainee' | 'admin') from a Zitadel role claim and map it to our `Role`.
 *  3. Build an `AuthProviderApi` whose `getAuthHeaders()` returns `{ Authorization: 'Bearer <token>' }`
 *     and whose `login()` redirects to Zitadel.
 *  4. Switch `AuthProvider.tsx` to use it (one line, driven by VITE_AUTH_MODE).
 */
export const ZITADEL_ENABLED = false;
