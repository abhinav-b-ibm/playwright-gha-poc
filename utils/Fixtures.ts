import { test as base, createBdd } from 'playwright-bdd';

/**
 * Fixtures.ts
 *
 * Extends Playwright's base test with the BDD step helpers (Given/When/Then).
 * Auth is handled by global-setup.ts (CI) or auth.setup.spec.ts (local dev) —
 * the storageState is loaded by playwright.config.ts before any test runs,
 * so no login step is needed inside individual scenarios.
 *
 * Usage in step definitions:
 *   import { Given, When, Then, expect } from '../../utils/Fixtures';
 */

export const test = base;

export const { Given, When, Then } = createBdd(test);
export { expect } from '@playwright/test';
