import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:3200' },
  webServer: {
    command: 'npx next dev -p 3200',
    url: 'http://localhost:3200/api/health',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_DIST_DIR: '.next-e2e' }
  }
});