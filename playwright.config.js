import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: 'http://127.0.0.1:3100', channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true, screenshot: 'only-on-failure' },
  webServer: {
    command: 'node server/index.js',
    url: 'http://127.0.0.1:3100/healthz',
    env: { PORT: '3100', NODE_ENV: 'development' },
    reuseExistingServer: false,
    timeout: 30000,
  },
});
