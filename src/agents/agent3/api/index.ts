import { createContext, createElement, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from '@/auth';
import type { Agent3Api } from './api';
import { createHttpApi } from './httpApi';
import { createMockApi } from './mockApi';

export { ApiError } from './api';
export type { Agent3Api, UploadResult } from './api';
export * from './types';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

const ApiContext = createContext<Agent3Api | null>(null);

/** Picks the real or mock API. Tests can pass `api` to inject a fake. */
export function Agent3ApiProvider({ children, api }: { children: ReactNode; api?: Agent3Api }) {
  const { getAuthHeaders } = useAuth();
  const value = useMemo(
    () => api ?? (USE_MOCKS ? createMockApi(getAuthHeaders) : createHttpApi(getAuthHeaders)),
    [api, getAuthHeaders],
  );
  return createElement(ApiContext.Provider, { value }, children);
}

export function useApi(): Agent3Api {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi must be used inside <Agent3ApiProvider>');
  return ctx;
}

export const isMockMode = USE_MOCKS;
