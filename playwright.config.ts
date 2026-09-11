import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({
  path: path.resolve(__dirname, '.env'),
});

/**
 * Stage 1 authentication creates:
 *
 *   auth.json
 *
 * GitHub Actions Stage 2 downloads that same file into the
 * repository root before running the tests.
 *
 * Local runs can also use the same file when it exists.
 */
const AUTH_FILE = path.resolve(__dirname, 'auth.json');

function authFileExists(): boolean {
  return fs.existsSync(AUTH_FILE);
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
   * Authentication is handled explicitly by GitHub Actions:
   *
   *   npx ts-node global-setup.ts
   *
   * Stage 1 creates auth.json.
   * Stage 2 downloads auth.json and the BDD project uses it
   * as its Playwright storageState.
   *
   * Do NOT configure globalSetup here as well.
   * Otherwise authentication could execute twice in CI.
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
         * Each shard produces index.json.
         * The report job merges those JSON files.
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
     * Tests run headless in CI.
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
     * AUTH SETUP
     * ----------------------------------------------------------
     *
     * Kept available for local/manual authentication setup.
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
     * BDD
     * ----------------------------------------------------------
     *
     * IMPORTANT:
     *
     * Stage 1 creates auth.json.
     * Stage 2 downloads auth.json.
     *
     * Therefore BDD must use auth.json here.
     */
    {
      name: 'bdd',

      testDir,

      use: {
        ...devices['Desktop Chrome'],

        storageState: authFileExists()
          ? AUTH_FILE
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
