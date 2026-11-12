import { defineConfig, devices } from '@playwright/test';

// Two browser-test projects, each on its own dev server so they never depend on .env.local:
//  - mock: Agents 2 and 3 on in-browser mock data. Needs nothing else.
//  - real: Agent 3 against the real Smart_Ops_Pod3 API on :8000 (see docs/agent3-api-and-mocks.md).
//          Skipped automatically when the backend is not running.
const MOCK_PORT = 5180;
const REAL_PORT = 5181;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  workers: 1,
  use: { trace: 'retain-on-failure' },
  projects: [
    {
      name: 'mock',
      testMatch: /(chat|agent2)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${MOCK_PORT}` },
    },
    {
      name: 'real',
      testMatch: /real\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${REAL_PORT}` },
    },
  ],
  webServer: [
    {
      command: `npm run dev -- --port ${MOCK_PORT} --strictPort`,
      url: `http://localhost:${MOCK_PORT}/login`,
      env: { VITE_USE_MOCKS: 'true' },
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: `npm run dev -- --port ${REAL_PORT} --strictPort`,
      url: `http://localhost:${REAL_PORT}/login`,
      env: { VITE_USE_MOCKS: 'false' },
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
