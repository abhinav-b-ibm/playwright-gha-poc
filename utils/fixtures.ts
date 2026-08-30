import { test as base, createBdd } from 'playwright-bdd';
import { Page } from '@playwright/test';
import { LoginPage } from '../pages/common/ui/LoginPage';

/**
 * Custom fixtures extending Playwright's base test.
 *
 * Usage in any spec:
 *   import { test } from '../../utils/fixtures';
 *
 *   test('my test', async ({ loggedInPage }) => {
 *     // IBM login already completed — page is ready to use
 *   });
 */

type CustomFixtures = {
  loggedInPage: Page;
};

export const test = base.extend<CustomFixtures>({
  loggedInPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.enterIBMid(process.env.WMIO_USER!);
    await loginPage.clickContinue();
    await loginPage.selectPasskey();
    await use(page);
  },
});

export const { Given, When, Then } = createBdd(test);
export { expect } from '@playwright/test';
