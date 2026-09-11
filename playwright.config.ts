import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({
  path: path.resolve(__dirname, '.env'),
});

const SESSION_FILE = path.resolve(
  __dirname,
  'tests/.auth/session.json',
);

function sessionExists(): boolean {
  return fs.existsSync(SESSION_FILE);
}

const testDir = defineBddConfig({
  features: 'tests/features/**/*.feature',
  steps: [
    'step-definitions/**/*.ts',
    'utils/fixtures.ts',
  ],
});

export default defineConfig({
  testDir: './tests',

  /*
   * Authentication is handled explicitly by the GitHub Actions
   * authentication job:
   *
   *   npx ts-node global-setup.ts
   *
   * Do not configure globalSetup here as well.
   * Otherwise authentication can execute twice in CI.
   */

  timeout: 600_000,

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 1 : 1,

  reporter: [
    [
      'html',
      {
        open: 'on-failure',
      },
    ],

    [
      'monocart-reporter',
      {
        name: 'Pivot Test Report',

        outputFile: 'monocart-report/index.html',

        /*
         * Required for CI shard merging.
         *
         * Each shard produces index.json.
         * The report job merges those JSON files
         * into one final index.html.
         */
        json: true,
      },
    ],

    [
      'list',
    ],
  ],

  use: {
    /*
     * CI and local runs use headless mode.
     *
     * The authentication job explicitly sets HEADLESS=false
     * when running global-setup.ts.
     */
    headless: true,

    /*
     * Keep traces when a test fails.
     */
    trace: 'retain-on-failure',

    /*
     * Capture screenshots only when a test fails.
     */
    screenshot: 'only-on-failure',

    /*
     * Capture video only when a test fails.
     */
    video: 'retain-on-failure',
  },

  projects: [

    /*
     * ----------------------------------------------------------
     * AUTH SETUP PROJECT
     * ----------------------------------------------------------
     *
     * Kept available for local/manual authentication setup.
     *
     * Example:
     *
     * npx playwright test \
     *   tests/auth.setup.spec.ts \
     *   --project=auth.setup \
     *   --headed
     */
    {
      name: 'auth.setup',

      testMatch: '**/auth.setup.spec.ts',

      use: {
        ...devices['Desktop Chrome'],
      },
    },

    /*
     * ----------------------------------------------------------
     * BDD TESTS
     * ----------------------------------------------------------
     *
     * BDD feature files use the saved browser session when it
     * exists.
     */
    {
      name: 'bdd',

      testDir,

      use: {
        ...devices['Desktop Chrome'],

        storageState: sessionExists()
          ? SESSION_FILE
          : {
              cookies: [],
              origins: [],
            },
      },
    },

    /*
     * ----------------------------------------------------------
     * NORMAL PLAYWRIGHT TESTS
     * ----------------------------------------------------------
     *
     * The GitHub Actions "specs" option maps to this project.
     *
     * There is intentionally no project named "specs".
     */
    {
      name: 'chromium',

      testIgnore: '**/auth.setup.spec.ts',

      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
