import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.resolve(__dirname, '.env') });

const SESSION_FILE = path.resolve(__dirname, 'tests/.auth/session.json');

function sessionExists(): boolean {
  return fs.existsSync(SESSION_FILE);
}

const testDir = defineBddConfig({
  features: 'tests/features/**/*.feature',
  steps: ['step-definitions/**/*.ts', 'utils/fixtures.ts'],
});

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  timeout: 60000,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    // Built-in Playwright HTML report (local dev — opens on failure)
    ['html', { open: 'on-failure' }],

    // Monocart — rich single-file HTML with embedded traces, screenshots & video
    ['monocart-reporter', {
      name: 'Pivot Test Report',
      outputFile: 'monocart-report/index.html',
    }],

    // Allure — dashboard with step breakdown, history & trend tracking
    ['allure-playwright', {
      outputFolder: 'allure-results',
      suiteTitle: true,
      resultsDir: 'allure-results',
      cleanResultsDir: true,
    }],

    // Console output while tests run
    ['list'],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',

    /* Run in headed mode (visible browser) and close automatically after each run */
    headless: true,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    // ── Auth setup — run once to save the browser session ──────────────────
    // Run manually when the session expires:
    //   npx playwright test tests/auth.setup.spec.ts --project=auth.setup --headed
    {
      name: 'auth.setup',
      testMatch: '**/auth.setup.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // ── BDD feature tests — use saved session so login is skipped ──────────
    {
      name: 'bdd',
      testDir,
      use: {
        ...devices['Desktop Chrome'],
        storageState: sessionExists() ? SESSION_FILE : { cookies: [], origins: [] },
      },
    },

    // ── Plain Playwright spec tests ────────────────────────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
