import { authenticator } from 'otplib';

/**
 * Generates a current Google Authenticator (TOTP) code from a base32 secret.
 *
 * How to get your secret:
 *   - When setting up 2FA, most apps show a "Can't scan?" / "manual entry" link
 *   - The secret is the alphanumeric string shown there (e.g. "JBSWY3DPEHPK3PXP")
 *   - Store it in .env as WMIO_TOTP_SECRET (never commit it)
 *
 * Usage:
 *   import { generateTOTP } from '../../utils/totp';
 *   const code = generateTOTP(process.env.WMIO_TOTP_SECRET!);
 *   await page.getByLabel('Authenticator code').fill(code);
 */
export function generateTOTP(secret: string): string {
  return authenticator.generate(secret);
}

/**
 * Returns how many seconds remain before the current TOTP code expires.
 * Useful for waiting out a nearly-expired code to avoid a race condition:
 *
 *   if (getRemainingSeconds() < 5) {
 *     await sleep(getRemainingSeconds() * 1000 + 1000);
 *   }
 */
export function getRemainingSeconds(): number {
  return authenticator.timeRemaining();
}
