/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Smart_Ops_Pod1 FastAPI (agent 1, Viva Agent). Port 8000 is Pod1's docker-compose dev default.
  const agent1Target = env.VITE_AGENT1_API_URL || 'http://localhost:8000';
  // Smart_Ops_Pod3 FastAPI. The backend has no CORS, so the dev server proxies it.
  const apiTarget = env.VITE_AGENT3_API_URL || 'http://localhost:8000';
  // Smart_Ops_Pod4 FastAPI (agent 4, ASGD). Port 8010 is the Pod 4 dev default.
  const agent4Target = env.VITE_AGENT4_API_URL || 'http://localhost:8010';

  // Bias Flagging Agent backend (Smart_Ops_Pod2/backend). No CORS there, so the dev server proxies it. Port 8001 so it does not clash with the Agent 3 backend on 8000.
  const agent2ApiTarget = env.VITE_AGENT2_API_URL || 'http://localhost:8001';

  return {
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5173,
      proxy: {
        '/agent1-api': {
          target: agent1Target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/agent1-api/, ''),
        },
        '/agent2-api': {
          target: agent2ApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/agent2-api/, ''),
        },
        '/agent3-api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/agent3-api/, ''),
        },
        '/agent4-api': {
          target: agent4Target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/agent4-api/, ''),
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      // Browser tests live in e2e/ and run under Playwright (npm run test:e2e).
      exclude: ['node_modules', 'dist', 'e2e'],
    },
  };
});
