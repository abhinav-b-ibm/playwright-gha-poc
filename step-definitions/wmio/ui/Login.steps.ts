import { Given, When, Then, expect } from '../../../utils/Fixtures';
import { WmioLoginPage } from '../../../pages/wmio/ui/WmioLoginPage';

let loginPage: WmioLoginPage;

Given('the user navigates to the wmio login page', async ({ page }) => {
  loginPage = new WmioLoginPage(page);
  await loginPage.goto();
});

When('the user enters credentials and completes authenticator verification', async () => {
  await loginPage.login(process.env.WMIO_USER!, process.env.WMIO_PASSWORD!);
});

Then('the user should be logged in and redirected away from the login page', async ({ page }) => {
  await expect(page).not.toHaveURL(process.env.WMIO_URL!, { timeout: 15000 });
});
