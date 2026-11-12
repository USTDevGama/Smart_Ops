import { createContext, createElement, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from '@/auth';
import type { Agent4Api } from './api';
import { createHttpApi } from './httpApi';
import { createMockApi } from './mockApi';

export { ApiError, type Agent4Api } from './api';
export * from './types';

// Same switch as agent 3: VITE_USE_MOCKS=true runs the screen on the in-memory API.
export const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

const ApiContext = createContext<Agent4Api | null>(null);

/** Picks the real or mock API. Tests can pass `api` to inject a fake. */
export function Agent4ApiProvider({ children, api }: { children: ReactNode; api?: Agent4Api }) {
  const { getAuthHeaders } = useAuth();
  const value = useMemo(
    () => api ?? (isMockMode ? createMockApi() : createHttpApi(getAuthHeaders)),
    [api, getAuthHeaders],
  );
  return createElement(ApiContext.Provider, { value }, children);
}

export function useAgent4Api(): Agent4Api {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useAgent4Api must be used inside <Agent4ApiProvider>');
  return ctx;
}
