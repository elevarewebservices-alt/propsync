import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/virtual-tours',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  outputDir: '.playwright-mcp/tour-results',
  reporter: 'list',
  use: {
    baseURL: process.env.TOUR_TEST_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    {
      name: 'iphone',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'webkit' },
    },
  ],
})
