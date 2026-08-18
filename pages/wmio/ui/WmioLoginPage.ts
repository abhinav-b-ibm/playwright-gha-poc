import { Page, expect } from '@playwright/test';

const WMIO_URL = process.env.WMIO_URL!;

export class WmioLoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(WMIO_URL);
  }

  async login(username: string, password: string) {
    await this.page.getByLabel('Username').fill(username);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Login' }).click();
    await expect(this.page).not.toHaveURL(WMIO_URL, { timeout: 10000 });
  }
}
