import { useMemo } from 'react';
import { useAuth } from '@/auth';
import type { HostAuth } from './bridge';
import { toBackendHeaders } from './devHeaders';

/**
 * PORTAL VERSION of host/useHostAuth.ts. The merge script copies this file over the standalone one.
 * The portal owns sign-in (Zitadel); this only adapts its useAuth() to what the UI needs.
 * Role mapping: 'admin' gets the flag-management page, any other portal role gets the run page.
 */
export function useHostAuth(): HostAuth {
  const { user, getAuthHeaders } = useAuth();
  return useMemo<HostAuth>(
    () => ({
      user: user ? { name: user.name, role: user.role === 'admin' ? 'admin' : 'user' } : null,
      getAuthHeaders: () => toBackendHeaders(getAuthHeaders()),
    }),
    [user, getAuthHeaders],
  );
}
