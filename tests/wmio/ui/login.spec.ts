import { test, expect } from '../../../utils/fixtures';
import { WmioLoginPage } from '../../../pages/wmio/ui/WmioLoginPage';

test('user can log in to wmio with username, password and Google Authenticator', async ({ page }) => {
  const loginPage = new WmioLoginPage(page);

  await test.step('Navigate to wmio login page', () => loginPage.goto());

  await test.step('Enter credentials', () =>
    loginPage.login(process.env.WMIO_USER!, process.env.WMIO_PASSWORD!)
  );

  await test.step('Verify login succeeded', async () => {
    await expect(page).not.toHaveURL(process.env.WMIO_URL!, { timeout: 15000 });
  });
});