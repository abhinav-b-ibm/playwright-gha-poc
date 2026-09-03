import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env') });

// ── Auth state paths ──────────────────────────────────────────────────────────
// CI (GitHub Actions): global-setup.ts saves auth.json automatically before tests.
// Local dev:           Run `npx playwright test tests/auth.setup.spec.ts --project=auth.setup --headed`
//                      to save tests/.auth/session.json once, then reuse for local runs.
const CI_AUTH_FILE    = path.resolve(__dirname, 'auth.json');
const LOCAL_AUTH_FILE = path.resolve(__dirname, 'tests/.auth/session.json');

function resolveStorageState(): string | { cookies: []; origins: [] } {
  if (fs.existsSync(CI_AUTH_FILE))    return CI_AUTH_FILE;
  if (fs.existsSync(LOCAL_AUTH_FILE)) return LOCAL_AUTH_FILE;
  return { cookies: [], origins: [] };
}

const testDir = defineBddConfig({
  features: 'tests/features/**/*.feature',
  steps: ['step-definitions/**/*.ts', 'utils/Fixtures.ts'],
});

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,

  reporter: [
    ['html', { open: 'on-failure' }],
    ['monocart-reporter', {
      name: 'Pivot Test Report',
      outputFile: 'monocart-report/index.html',
    }],
    ['allure-playwright', {
      outputFolder: 'allure-results',
      suiteTitle: true,
      resultsDir: 'allure-results',
      cleanResultsDir: true,
    }],
    ['list'],
  ],

  use: {
    /* Base URL driven by WMIO_URL env var / secret */
    baseURL: process.env.WMIO_URL ?? 'https://prod167095.a-vir-c2.platform.ipaas.test.automation.ibm.com',

    /* Headless in CI (HEADLESS=true), headed locally */
    headless: process.env.HEADLESS === 'true',

    /* Auth state: prefers CI auth.json, falls back to local session.json */
    storageState: resolveStorageState(),

    actionTimeout:     30_000,
    navigationTimeout: 60_000,

    trace:      'retain-on-failure',
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',
  },

  projects: [
    // ── Auth setup — LOCAL DEV ONLY ───────────────────────────────────────
    // Run once when your session expires:
    //   npx playwright test tests/auth.setup.spec.ts --project=auth.setup --headed
    // CI uses global-setup.ts instead (runs automatically before every pipeline run).
    {
      name: 'auth.setup',
      testMatch: '**/auth.setup.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined,  // auth setup must not use existing state
      },
    },

    // ── BDD feature tests (playwright-bdd) ────────────────────────────────
    {
      name: 'bdd',
      testDir,
      use: {
        ...devices['Desktop Chrome'],
        storageState: resolveStorageState(),
      },
      testIgnore: ['**/auth.setup.spec.ts'],
    },

    // ── Plain Playwright spec tests ───────────────────────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/auth.setup.spec.ts'],
    },
  ],
});
