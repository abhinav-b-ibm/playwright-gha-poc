import { test, expect } from '@playwright/test';
import { generateTOTP } from '../utils/totp';

test('test', async ({ page }) => {
  await page.goto(process.env.WMIO_URL!);
  await page.getByRole('textbox', { name: 'IBMid' }).fill(process.env.IBM_EMAIL!);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: ' w3id Password  Use your' }).click();
  await page.getByRole('textbox', { name: 'IBM email address (e.g. jdoe@' }).click();
  await page.getByRole('textbox', { name: 'IBM email address (e.g. jdoe@' }).fill(process.env.IBM_EMAIL!);
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.WMIO_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  const totpCode = generateTOTP(process.env.WMIO_TOTP_SECRET!);
  await page.getByLabel('One-time passcode').fill(totpCode);
  await page.getByRole('button', { name: 'submit_btn' }).click();
});
