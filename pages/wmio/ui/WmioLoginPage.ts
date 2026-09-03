import { Page, expect } from '@playwright/test';
import { generateTOTP } from '../../../utils/Totp';

const WMIO_URL = process.env.WMIO_URL!;

export class WmioLoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(WMIO_URL);
  }

  async login(username: string, password: string) {
    // ── If storageState (auth.json) already has a valid session, the goto()
    // will land on the portal dashboard — skip the SSO flow entirely.
    const currentUrl = this.page.url();
    const portalDomain = WMIO_URL.replace(/https?:\/\//, '').split('/')[0];
    if (currentUrl.includes(portalDomain)) {
      // Already authenticated — nothing to do
      return;
    }

    // Dismiss cookie consent banner if present
    const acceptAll = this.page.getByRole('button', { name: /accept all/i });
    await acceptAll.waitFor({ state: 'visible', timeout: 8000 }).catch(() => null);
    if (await acceptAll.isVisible()) {
      await acceptAll.click();
    }

    // Step 1: IBMid entry screen (field confirmed: id="username", label="IBMid")
    const emailInput = this.page.locator('#username');
    await emailInput.waitFor({ state: 'visible', timeout: 20_000 });
    await emailInput.fill(username);

    // Click Continue
    await this.page.locator('button[type="submit"]').click();

    // Step 2: After email submit — either w3id selector, password field, or already in
    const w3idBtn  = this.page.locator('#credentialSignin').or(this.page.getByText('w3id Password', { exact: true }));
    const pwdField = this.page.locator('#password');   // confirmed id from live DOM inspection

    const afterEmail = await Promise.race([
      w3idBtn.waitFor({ state: 'visible',  timeout: 25_000 }).then(() => 'selector'),
      pwdField.waitFor({ state: 'visible', timeout: 25_000 }).then(() => 'password'),
    ]).catch(() => 'timeout');

    if (afterEmail === 'selector') {
      await w3idBtn.click();
      // After selector: w3id user/password fields appear
      const w3idUser = this.page.locator('#user-name-input');
      const w3idPwd  = this.page.locator('#password-input').or(this.page.locator('#password'));
      await w3idUser.waitFor({ state: 'visible', timeout: 15_000 });
      await w3idUser.fill(username);
      await w3idPwd.fill(password);
    } else if (afterEmail === 'password') {
      // Password appeared directly (prepiam/authsvc flow — confirmed)
      await pwdField.fill(password);
    } else {
      throw new Error('WmioLoginPage.login: timed out waiting for password or selector after email submit');
    }

    // Click Log in / Sign In (id="signinbutton" confirmed for prepiam/authsvc)
    await this.page.locator('#signinbutton')
      .or(this.page.locator('#login-button'))
      .or(this.page.getByRole('button', { name: /log.?in|sign.?in/i }))
      .click();

    // Step 3: OTP (optional)
    const otpInput = this.page.locator('#otp-input');
    const otpVisible = await otpInput.isVisible().catch(() => false);
    if (!otpVisible) {
      // wait a moment and check again — OTP page may load after navigation
      await this.page.waitForTimeout(2000);
    }
    if (await otpInput.isVisible()) {
      const totpCode = generateTOTP(process.env.WMIO_TOTP_SECRET!);
      await otpInput.fill(totpCode);
      await this.page.locator('#submit_btn').click();
    }

    // Wait until we're back on the portal
    await this.page.waitForURL(new RegExp(portalDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), {
      timeout: 120_000
    });
  }
}