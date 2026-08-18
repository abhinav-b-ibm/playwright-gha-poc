import { test, expect } from '../../../utils/fixtures';
import { WmioLoginPage } from '../../../pages/wmio/ui/WmioLoginPage';
import { generateTOTP, getRemainingSeconds } from '../../../utils/totp';
import { sleep } from '../../../utils/helpers';

test('user can log in to wmio with username, password and Google Authenticator', async ({ page }) => {
  const loginPage = new WmioLoginPage(page);

  await test.step('Navigate to wmio login page', () => loginPage.goto());

  await test.step('Enter credentials', () =>
    loginPage.login(process.env.WMIO_USER!, process.env.WMIO_PASSWORD!)
  );

  await test.step('Enter Google Authenticator code', async () => {
    // If the code is about to expire, wait for a fresh one to avoid a race condition
    if (getRemainingSeconds() < 5) {
      await sleep((getRemainingSeconds() + 1) * 1000);
    }
    const totpCode = generateTOTP(process.env.WMIO_TOTP_SECRET!);
    await page.getByLabel('Authenticator code').fill(totpCode);
    await page.getByRole('button', { name: 'Verify' }).click();
  });

  await test.step('Verify login succeeded', async () => {
    await expect(page).not.toHaveURL(process.env.WMIO_URL!, { timeout: 15000 });
  });
});