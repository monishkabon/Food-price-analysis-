import { defineConfig, devices } from '@playwright/test';
const channel = process.env.PLAYWRIGHT_CHANNEL;
export default defineConfig({
  testDir: './e2e', fullyParallel: true, retries: 1, reporter: 'list',
  use: { trace: 'on-first-retry', channel },
  webServer: [
    { command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', env: { VITE_API_MODE: 'mock' } },
    { command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort', url: 'http://127.0.0.1:4174', env: { VITE_API_MODE: 'live' } },
  ],
  projects: [
    { name: 'chromium', testMatch: 'app.spec.ts', use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4173' } },
    { name: 'mobile', testMatch: 'app.spec.ts', use: { ...devices['Pixel 5'], baseURL: 'http://127.0.0.1:4173' } },
    { name: 'live-chromium', testMatch: 'live.spec.ts', use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4174' } },
    { name: 'live-mobile', testMatch: 'live.spec.ts', use: { ...devices['Pixel 5'], baseURL: 'http://127.0.0.1:4174' } },
  ],
});
