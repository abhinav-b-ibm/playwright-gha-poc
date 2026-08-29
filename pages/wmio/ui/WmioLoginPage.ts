import { Page, expect } from '@playwright/test';
import { generateTOTP } from '../../../utils/totp';

const WMIO_URL = process.env.WMIO_URL!;

export class WmioLoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(WMIO_URL);
  }

  async login(username: string, password: string) {
    // Dismiss cookie consent banner if present — it intercepts pointer events and blocks form interaction
    const cookieBanner = this.page.locator('banner[aria-label="consent_blackbar"]');
    const acceptAll = this.page.getByRole('button', { name: 'Accept all' });
    await acceptAll.waitFor({ state: 'visible', timeout: 8000 }).catch(() => null);
    if (await acceptAll.isVisible()) {
      await acceptAll.click();
      await cookieBanner.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => null);
    }

    // Step 1: IBMid entry screen — wait for the input to be ready before filling
    const emailInput = this.page.locator('#username');
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill(username);
    await expect(emailInput).toHaveValue(username);

    // Click Continue and wait for the URL to change away from the IBMid entry screen
    await this.page.locator('button[type="submit"]').click();
    await this.page.waitForURL(/prepiam|w3\.ibm\.com|login/, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Step 2: Sign-in method selection — wait for it to appear after navigation
    await this.page.locator('#credentialSignin').waitFor({ state: 'visible', timeout: 20000 });
    await this.page.locator('#credentialSignin').click();

    // Step 3: w3id credentials screen — wait for navigation to settle first
    await this.page.locator('#user-name-input').waitFor({ state: 'visible', timeout: 15000 });
    await this.page.locator('#user-name-input').fill(username);
    await this.page.locator('#password-input').fill(password);

    await this.page.locator('#login-button').click();
    await this.page.waitForURL(/prepiam|w3\.ibm\.com|wmio|integration/, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Step 4: OTP screen (optional)
    const otpInput = this.page.locator('#otp-input');
    const otpVisible = await expect(otpInput).toBeVisible({ timeout: 10000 }).then(() => true).catch(() => false);
    if (otpVisible) {
      const totpCode = generateTOTP(process.env.WMIO_TOTP_SECRET!);
      await otpInput.fill(totpCode);
      await this.page.locator('#submit_btn').click();
    }
  }
}