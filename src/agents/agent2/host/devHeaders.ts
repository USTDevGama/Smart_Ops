/**
 * Adapts the portal's headers to the Pod 2 backend. Only the DEVELOPMENT sign-in is touched.
 *
 * The portal's dev login sends `X-Dev-User` and `X-Dev-Role` with the portal's role names (`trainee` or `admin`).
 * The backend's non-admin role is `user`, so `trainee` is sent as `user`; `admin` stays `admin`.
 * The real sign-in (`Authorization: Bearer <token>`) is passed through exactly as the portal gave it: this file never
 * reads, builds or stores a token, and no token or role ever goes into a VITE_* variable or the bundle.
 *
 * The backend must accept the dev headers only in a clearly development-only environment and never in production.
 */
export function toBackendHeaders(headers: Record<string, string>): Record<string, string> {
  if (headers['X-Dev-Role'] === 'trainee') return { ...headers, 'X-Dev-Role': 'user' };
  return headers;
}
