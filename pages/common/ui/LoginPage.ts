import { Page } from '@playwright/test';

const LOGIN_URL = process.env.LOGIN_URL!;

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(LOGIN_URL);
  }

  async enterIBMid(email: string) {
    await this.page.getByRole('textbox', { name: 'IBMid' }).fill(email);
  }

  async clickContinue() {
    await this.page.getByRole('button', { name: 'Continue' }).click();
  }

  async selectPasskey() {
    await this.page.getByRole('button', { name: 'Passkey (IBM preferred)  Use' }).click();
  }
}
