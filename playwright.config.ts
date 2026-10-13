// Design Ref: §8.1, §8.4 — L3 E2E against the production build, in the locally installed Chrome
// (channel 'chrome'), so no Playwright browser download is needed.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4181;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    channel: 'chrome',
    locale: 'ko-KR',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
