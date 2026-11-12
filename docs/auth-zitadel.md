# Authentication: dev login now, Zitadel later

## Today (development login)

- `LoginPage` takes a name and a role (Trainee or Admin).
- `AuthProvider` keeps `{ name, role }` in `sessionStorage` (key `main-ui.dev-user`).
- `getAuthHeaders()` returns `X-Dev-User` and `X-Dev-Role`. Smart_Ops_Pod3 accepts these only while it runs with `PODC_ENV` of `local` or `dev`.
- This is **not secure**. Anyone can pick any role. Never deploy it.

## The seam

Everything outside `src/auth` uses only this interface (`src/auth/types.ts`):

```ts
interface AuthProviderApi {
  user: { name: string; role: 'trainee' | 'admin' } | null;
  login(name: string, role: Role): void; // dev only
  logout(): void;
  getAuthHeaders(): Record<string, string>;
}
```

Agents call `useAuth()` and never touch storage, tokens or the identity provider.

## Plan for Zitadel

1. **Zitadel setup** (identity team): create a project and a SPA application using the Authorization Code flow with PKCE. Add redirect URIs (`<origin>/auth/callback`) and the post-logout URI. Create two project roles, `trainee` and `admin`, and include roles in the ID/access token claims.
2. **Library**: add `oidc-client-ts`. Configure authority (issuer URL), client id, redirect URIs and scopes `openid profile email` plus the Zitadel roles scope.
3. **Implement the interface** in `src/auth/zitadelAuth.ts`:
   - `login()` redirects to Zitadel; add a `/auth/callback` route that completes sign-in.
   - Map the role claim to `Role`. If a user has both, decide the rule (suggest: admin wins). If neither, show "no access".
   - `getAuthHeaders()` returns `{ Authorization: 'Bearer <access token>' }`; renew tokens silently.
   - `logout()` ends the Zitadel session.
4. **Switch** `AuthProvider.tsx` to the Zitadel implementation, driven by an env var such as `VITE_AUTH_MODE=zitadel`. Enable the "Sign in with Zitadel" button on the login page and hide the name/role form.
5. **Backends**: each agent's backend validates the token and reads the role itself. Smart_Ops_Pod3's seam is `current_user` in `app/api/deps.py`. Replace the dev headers there. The backend also needs to allow the new header if CORS is introduced.
6. **Remove** the dev form from production builds.

## Configuration (planned)

| Variable                 | Meaning            |
| ------------------------ | ------------------ |
| `VITE_AUTH_MODE`         | `dev` or `zitadel` |
| `VITE_ZITADEL_ISSUER`    | Issuer URL         |
| `VITE_ZITADEL_CLIENT_ID` | SPA client id      |

## Open questions for the identity team

- Role claim name and shape.
- What happens for users with no role, or with both roles.
- Session length and silent-renew policy.
