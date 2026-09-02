/**
 * Auth Setup — run once to save browser session to disk.
 *
 * Usage:
 *   npx playwright test tests/auth.setup.spec.ts --project=auth.setup --headed
 *
 * This saves authenticated state to tests/.auth/session.json.
 * Subsequent test runs load this file and skip the login flow entirely.
 *
 * Required .env vars:
 *   IBM_EMAIL    - your IBM email
 *   IBM_PASSWORD - your w3id password
 *   TOTP_SECRET  - base32 secret from Google Authenticator
 *   WMIO_PRE_PROD_URL - portal base URL e.g. https://prod476796.a-vir-c1.int.ipaas.preprod.automation.ibm.com/
 */

import { test as setup, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export const SESSION_FILE = path.resolve(__dirname, '.auth/session.json');

// Ensure the .auth directory exists before Playwright tries to write to it
fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });

const BASE_URL = process.env.WMIO_PRE_PROD_URL!;

async function snap(page: Page, label: string) {
  await page.screenshot({ path: `screenshots/auth-${label}.png`, fullPage: true });
  console.log(`📸 screenshot: auth-${label}.png`);
}

setup('authenticate and save session', async ({ page }) => {
  setup.setTimeout(120_000);
  // ─── login helper ──────────────────────────────────────────────────────────

  async function login(page: Page) {
    const email      = process.env.IBM_EMAIL;
    const password   = process.env.IBM_PASSWORD;
    const totpSecret = process.env.TOTP_SECRET;

    if (!email)      throw new Error('IBM_EMAIL env var is not set');
    if (!password)   throw new Error('IBM_PASSWORD env var is not set');
    if (!totpSecret) throw new Error('TOTP_SECRET env var is not set');

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    // Wait for the email field to be ready before interacting
    await page.locator('input#username').waitFor({ state: 'visible', timeout: 30_000 });
    await snap(page, '01-login-page');
  
    // IBM Security Verify uses Carbon Design System inputs.
    // Use type() + Enter to reliably submit the email — more robust than fill + click.
    const emailInput = page.locator('input#username');
    await emailInput.click();
    await emailInput.fill(email);
    await snap(page, '02-email-filled');
  
    // Press Enter to submit the email form (equivalent to clicking Continue)
    await emailInput.press('Enter');
    console.log('✅ Email submitted via Enter key');

    // Wait for the page to transition — the Continue button will disappear
    // as the SPA re-renders into the next auth step
    await page.getByRole('button', { name: /continue/i }).waitFor({ state: 'hidden', timeout: 30_000 });
    await snap(page, '03-after-continue');

    // Two possible next states — handle both:
    //   (a) "w3id Password" selection screen  → click it → password form appears
    //   (b) Password form appears directly
    //
    // Race both locators — whichever appears first unblocks the Promise.race.
    // This avoids the isVisible() false-negative when the w3id screen hasn't
    // rendered yet at the instant the check fires (the original bug).
    const w3idPasswordText = page.getByText('w3id Password', { exact: true });
    const passwordInput    = page.getByPlaceholder(/Password/i);

    await Promise.race([
      w3idPasswordText.waitFor({ state: 'visible', timeout: 20_000 }),
      passwordInput.waitFor({ state: 'visible', timeout: 20_000 }),
    ]);

    // Now check which branch won — isVisible() is safe here because one of
    // them is guaranteed to be visible already.
    if (await w3idPasswordText.isVisible().catch(() => false)) {
      await w3idPasswordText.click();
      console.log('✅ Clicked w3id Password option');
    }

    // Wait for the password field to be visible (covers both paths)
    await passwordInput.waitFor({ state: 'visible', timeout: 20_000 });
    await snap(page, '04-w3id-signin-form');

    // Fill credentials — IBM email field may or may not be present (sometimes pre-filled)
    const ibmEmailField = page.getByPlaceholder(/IBM email address/i);
    if (await ibmEmailField.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await ibmEmailField.fill(email);
    }
    await page.getByPlaceholder(/Password/i).click();
    await page.getByPlaceholder(/Password/i).fill(password);

    // Click Sign In and wait for the SAML redirect chain to begin.
    // We intentionally do NOT await waitForURL immediately — the SAML chain
    // detaches frames mid-flight which causes ERR_ABORTED with 'load'.
    // Instead: click, give the browser a moment to start redirecting, then
    // wait for the final portal URL using 'domcontentloaded' (never 'load').
    await page.getByRole('button', { name: /sign in/i }).click();
    console.log('✅ W3ID credentials submitted — following SAML redirects...');

    // Small pause so the first SAML POST navigation can fire before we attach
    // our URL watcher — prevents the ERR_ABORTED frame-detach race.
    await page.waitForTimeout(2000);

    await page.waitForURL(/webmethods|ipaas/, { timeout: 90_000, waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
    console.log('✅ Logged in — URL:', page.url());
    await snap(page, '04-post-login');
  }

  await login(page);

  // ── Save session to disk ──────────────────────────────────────────────────
  await page.context().storageState({ path: SESSION_FILE });
  console.log('✅ Session saved to', SESSION_FILE);
});
