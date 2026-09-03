/**
 * global-setup.ts
 *
 * Runs once before all tests.
 * 1. Establishes / reuses an IBM w3id session for WMIO API-level tests
 *    (stored in .wmio-session.json via wmioSession.ensureSession).
 * 2. Saves a full Playwright browser auth state to auth.json so every
 *    UI test starts already logged in (storageState in playwright.config.ts).
 *
 * Handles IBM SSO providers (auto-detected by redirect URL):
 *   - prepiam.ice.ibmcloud.com        (w3id — preprod/prod tenants)
 *   - console-ibm-stg.verify.ibm.com  (IBM Security Verify — dev tenants)
 *   - iam.cloud.ibm.com / login.ibm.com (IBM Cloud IAM — test/AWS tenants)
 *
 * Known tenants:
 *   - prod476796  int.ipaas.preprod    — original preprod
 *   - prod731523  int.ipaas.dev        — dev tenant (verify.ibm.com SSO)
 *   - prod167095  platform.ipaas.test  — IWHI AWS Test (primary from now on)
 *
 * Both int.ipaas/platform.ipaas (WMIO portal) and apigw.ipaas (API Gateway UI)
 * sessions are captured in auth.json so tests against either domain work without
 * re-authenticating.
 *
 * If PIVOT_MANUAL_TEST_URL is set and differs from WMIO_URL, a second login
 * is performed for that tenant so its cookies are also included in auth.json.
 */

import { chromium, Page } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { ensureSession } from './utils/WmioSession';
import { generateTOTP } from './utils/Totp';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const INT_BASE          = process.env.WMIO_URL               ?? 'https://prod167095.a-vir-c2.platform.ipaas.test.automation.ibm.com';
const MANUAL_TEST_BASE  = process.env.PIVOT_MANUAL_TEST_URL  ?? INT_BASE;
const APIGW_BASE        = process.env.APIGW_URL              ?? 'https://prod167095.a-vir-c2.apigw.ipaas.test.automation.ibm.com/apigatewayui/#/manageapi';
const AUTH_FILE         = path.resolve(__dirname, 'auth.json');
const MAX_AGE_MS        = 8 * 60 * 60 * 1000; // 8 hours

// ─────────────────────────────────────────────────────────────────────────────
// Shared login helper — auto-detects IBM SSO provider from redirect URL:
//   prepiam.ice.ibmcloud.com        (w3id, preprod/prod)
//   console-ibm-stg.verify.ibm.com  (IBM Security Verify, dev)
//   iam.cloud.ibm.com               (IBM Cloud IAM, test/AWS tenants)
// ─────────────────────────────────────────────────────────────────────────────
async function loginToPortal(
  page: Page,
  baseUrl: string,
  email: string,
  password: string,
  totpSecret: string,
  label: string,
): Promise<void> {
  console.log(`🔐 Global setup: logging into ${label} (${baseUrl})...`);
  await page.goto(`${baseUrl}/`);

  const acceptBtn = page.getByRole('button', { name: /accept all/i });
  await acceptBtn.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  if (await acceptBtn.isVisible()) {
    await acceptBtn.click();
    await page.waitForTimeout(500);
  }

  const dashboard = page.getByRole('heading', { name: 'Projects', level: 1 });

  // Already logged in?
  const alreadyIn = await dashboard.isVisible().catch(() => false);
  if (alreadyIn) {
    console.log(`✅ Global setup: ${label} already authenticated`);
    return;
  }

  // ── Detect which SSO provider we landed on ────────────────────────────────
  // Wait for either the IBMid email field (prepiam) or the
  // IBM Security Verify sign-in page (verify.ibm.com)
  const ibmIdEmailField  = page.locator('#username').or(page.getByPlaceholder('username@company.com'));
  const verifyEmailField = page.locator('input[id*="username"], input[name="username"], input[type="email"]').first();

  // Give the SSO redirect up to 20 s to settle
  await page.waitForLoadState('domcontentloaded', { timeout: 20_000 }).catch(() => {});

  const currentUrl = page.url();
  const isVerify   = currentUrl.includes('verify.ibm.com') || currentUrl.includes('console-ibm-stg');
  const isIamCloud = currentUrl.includes('iam.cloud.ibm.com') || currentUrl.includes('login.ibm.com');
  // platform.ipaas.test tenant (prod167095) uses IBM w3id / prepiam SSO
  const isPrepiam  = currentUrl.includes('prepiam') || currentUrl.includes('w3id') ||
                     (!isVerify && !isIamCloud);   // fallthrough = treat as prepiam/w3id

  console.log(`  ↳ SSO redirect landed on: ${currentUrl}`);
  console.log(`  ↳ SSO type: ${isVerify ? 'IBM Security Verify' : isIamCloud ? 'IBM Cloud IAM' : 'w3id/prepiam (default)'}`);

  // Take a screenshot at this point so we can diagnose SSO failures
  const screenshotDir = path.resolve(__dirname, 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, `sso-${label.replace(/[^a-z0-9]/gi, '_')}.png`), fullPage: true })
    .catch(() => {});

  if (isVerify || isIamCloud) {
    // ── IBM Security Verify / IBM Cloud IAM flow ────────────────────────────
    // Both providers share the same basic structure:
    //   email → continue → password → [OTP] → dashboard
    console.log(`  ↳ Detected ${isVerify ? 'IBM Security Verify' : 'IBM Cloud IAM'} SSO`);

    await verifyEmailField.waitFor({ state: 'visible', timeout: 20_000 });
    await verifyEmailField.fill(email);

    // "Continue" or "Sign in" button
    const continueBtn = page.getByRole('button', { name: /continue|sign.?in|next/i });
    await continueBtn.click();

    // Password field (may appear on next page)
    const passwordField = page.locator('input[type="password"]');
    await passwordField.waitFor({ state: 'visible', timeout: 20_000 });
    await passwordField.fill(password);

    const signInBtn = page.getByRole('button', { name: /sign.?in|log.?in|submit/i });
    await signInBtn.click();

    // TOTP / MFA step (if present)
    const otpField = page.locator('input[id*="otp"], input[id*="code"], input[placeholder*="code" i], input[aria-label*="code" i]').first();
    const afterPwd = await Promise.race([
      otpField.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'otp'),
      dashboard.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'dashboard'),
    ]).catch(() => 'timeout');

    if (afterPwd === 'otp') {
      await otpField.fill(generateTOTP(totpSecret));
      const submitBtn = page.getByRole('button', { name: /submit|verify|continue/i });
      await submitBtn.click();
      await dashboard.waitFor({ state: 'visible', timeout: 120_000 });
    } else if (afterPwd === 'timeout') {
      console.warn(`⚠️  Global setup: ${label} — timed out waiting for OTP or dashboard after password`);
    }

  } else {
    // ── w3id / prepiam flow (original) ─────────────────────────────────────
    await ibmIdEmailField.waitFor({ state: 'visible', timeout: 15_000 });
    await ibmIdEmailField.fill(email);
    await page.locator('button[type="submit"]')
      .or(page.getByRole('button', { name: /continue/i }))
      .click();

    const w3idBtn = page.locator('#credentialSignin').or(page.getByText('w3id Password', { exact: true }));
    const afterEmail = await Promise.race([
      w3idBtn.waitFor({ state: 'visible',  timeout: 30_000 }).then(() => 'w3id'),
      dashboard.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'dashboard'),
    ]);

    if (afterEmail === 'w3id') {
      await w3idBtn.click();
      const userField = page.locator('#user-name-input').or(page.getByPlaceholder(/IBM email address/));
      await userField.waitFor({ state: 'visible', timeout: 15_000 });
      await userField.fill(email);
      await page.locator('#password-input').or(page.getByPlaceholder(/Password/i)).fill(password);
      await page.locator('#login-button').or(page.getByRole('button', { name: /sign in/i })).click();

      const otpInput = page.locator('#otp-input').or(page.getByPlaceholder('One-time passcode'));
      const reached  = await Promise.race([
        otpInput.waitFor({ state: 'visible', timeout: 60_000 }).then(() => 'otp'),
        dashboard.waitFor({ state: 'visible', timeout: 60_000 }).then(() => 'dashboard'),
      ]);
      if (reached === 'otp') {
        await otpInput.fill(generateTOTP(totpSecret));
        await page.locator('#submit_btn').or(page.getByRole('button', { name: /submit/i })).click();
        await dashboard.waitFor({ state: 'visible', timeout: 120_000 });
      }
    }
  }

  console.log(`✅ Global setup: ${label} authenticated`);
}

export default async function globalSetup() {
  console.log('════════════════════════════════════════════');
  console.log('🚀 global-setup.ts starting');
  console.log(`   __dirname : ${__dirname}`);
  console.log(`   AUTH_FILE : ${AUTH_FILE}`);
  console.log(`   cwd       : ${process.cwd()}`);
  console.log(`   WMIO_URL  : ${process.env.WMIO_URL ?? '(not set)'}`);
  console.log(`   WMIO_USER : ${process.env.WMIO_USER ? '(set)' : '(NOT SET)'}`);
  console.log(`   WMIO_PASSWORD : ${process.env.WMIO_PASSWORD ? '(set)' : '(NOT SET)'}`);
  console.log(`   WMIO_TOTP_SECRET : ${process.env.WMIO_TOTP_SECRET ? '(set)' : '(NOT SET)'}`);
  console.log('════════════════════════════════════════════');

  // Hoisted so the catch block can close the browser if launch succeeded
  let browser: import('@playwright/test').Browser | undefined;

  try {
  // ── 1. Ensure WMIO API session (for API-level BDD steps) ──────────────────
  // Non-fatal: if WMIO_INSTANCE_API_KEY is not set or the API call fails,
  // log a warning and continue — UI tests don't need this session.
  // Only @api / @flowExecution BDD tests use it.
  await ensureSession().catch((err: Error) => {
    console.warn(`⚠️  Global setup: ensureSession() failed — API tests will not work.`);
    console.warn(`   Reason: ${err.message}`);
    console.warn(`   UI tests are unaffected — continuing with browser login.`);
  });

  // ── 2. Reuse browser auth.json if still fresh ─────────────────────────────
  // On CI: the runner workspace is fresh each run — auth.json won't exist.
  // On local dev: reuse if less than 8 hours old.
  if (fs.existsSync(AUTH_FILE)) {
    const age = Date.now() - fs.statSync(AUTH_FILE).mtimeMs;
    if (age < MAX_AGE_MS) {
      console.log(`✅ Global setup: reusing auth.json (${Math.round(age / 60000)}m old)`);
      return;
    }
    console.log(`ℹ️  auth.json exists but is ${Math.round(age / 60000)}m old — refreshing`);
  } else {
    console.log(`ℹ️  auth.json does not exist — will create fresh`);
  }

  const email      = process.env.WMIO_USER        ?? process.env.IBM_EMAIL!;
  const password   = process.env.WMIO_PASSWORD    ?? process.env.IBM_PASSWORD!;
  const totpSecret = process.env.WMIO_TOTP_SECRET ?? process.env.TOTP_SECRET!;

  if (!email)      throw new Error('WMIO_USER (or IBM_EMAIL) is not set in .env');
  if (!password)   throw new Error('WMIO_PASSWORD (or IBM_PASSWORD) is not set in .env');
  if (!totpSecret) throw new Error('WMIO_TOTP_SECRET (or TOTP_SECRET) is not set in .env');

  const headless = process.env.HEADLESS === 'true';
  browser  = await chromium.launch({ headless });
  const context  = await browser.newContext();

  // Block TrustArc/OneTrust consent banner script
  await context.route(/truste\.com|trustarc\.com|cookielaw\.org/, r => r.abort());

  const page = await context.newPage();

  // ── 3. Log into primary WMIO tenant (int.ipaas) ───────────────────────────
  await loginToPortal(page, INT_BASE, email, password, totpSecret, 'WMIO (int.ipaas)');

  // ── 4. Log into manual-test tenant if it differs from WMIO_URL ────────────
  // PIVOT_MANUAL_TEST_URL may point to a dev tenant with a different SSO provider.
  // By navigating there now (in the same browser context), its cookies are included
  // in the saved auth.json and tests against that domain skip the login page.
  if (MANUAL_TEST_BASE !== INT_BASE) {
    console.log(`🔐 Global setup: PIVOT_MANUAL_TEST_URL differs from WMIO_URL — logging into dev tenant...`);
    await loginToPortal(page, MANUAL_TEST_BASE, email, password, totpSecret, 'PIVOT manual-test tenant');
  }

  // ── 5. Establish apigw session (already authenticated via SSO cookie reuse) ─
  // Since we're in the same browser context that just logged into the WMIO portal,
  // navigating to the apigw URL will reuse the SSO session automatically.
  // No separate login needed — just navigate and wait for the page to load.
  console.log('🔐 Global setup: establishing apigw session...');
  await page.goto(APIGW_BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const apigwUrl = page.url();
  const isOnApigw = apigwUrl.includes('apigw');
  if (isOnApigw) {
    console.log(`✅ Global setup: apigw session established (${apigwUrl})`);
  } else {
    console.warn(`⚠️  Global setup: apigw may not be authenticated — URL: ${apigwUrl}`);
  }

  // ── 6. Suppress consent banners via cookies ────────────────────────────────
  await context.addCookies([
    { name: 'cmapi_cookie_privacy', value: 'permit 1,2,3', domain: '.ibm.com', path: '/' },
    { name: 'notice_gdpr_prefs',    value: '0,1,2:',       domain: '.ibm.com', path: '/' },
    { name: 'notice_preferences',   value: '2:',            domain: '.ibm.com', path: '/' },
  ]);

  // ── 7. Save combined browser auth state ───────────────────────────────────
  await context.storageState({ path: AUTH_FILE });
  console.log('✅ Global setup: auth.json saved (WMIO + manual-test + apigw sessions)');
  console.log(`   Saved to: ${AUTH_FILE}`);

  await browser.close();
  console.log('✅ Global setup: complete');

  } catch (err: any) {
    // Print the full error so it appears clearly in GitHub Actions logs
    console.error('❌ Global setup FAILED with error:');
    console.error(`   ${err?.message ?? err}`);
    if (err?.stack) console.error(err.stack);
    // Attempt to close browser if it was opened
    try { await browser?.close(); } catch {}
    throw err;  // re-throw so the CI step fails
  }
}

// ── Self-invoke when run directly via ts-node ─────────────────────────────
// When Playwright runs this file as globalSetup it imports and calls the
// default export itself. When run via `npx ts-node global-setup.ts` (CI Auth
// stage) the default export is never called automatically — this block calls it.
if (require.main === module) {
  globalSetup().catch((err: Error) => {
    console.error('❌ global-setup.ts failed:', err.message);
    process.exit(1);
  });
}
