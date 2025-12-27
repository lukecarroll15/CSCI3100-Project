import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      MONGO_URI: 'mongodb://127.0.0.1:27017/taskflow_e2e',
      NODE_ENV: 'test',
      OTP_TEST_CODE: '000000',
      INITIAL_ADMIN_KEY: 'TEST-KEYS-0000',
    },
  },
});
