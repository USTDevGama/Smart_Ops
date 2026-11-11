/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Smart_Ops_Pod3 FastAPI. The backend has no CORS, so the dev server proxies it.
  const apiTarget = env.VITE_AGENT3_API_URL || 'http://localhost:8000';

  return {
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5173,
      proxy: {
        '/agent3-api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/agent3-api/, ''),
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
