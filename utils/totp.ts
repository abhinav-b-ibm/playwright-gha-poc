import { generateSync, createGuardrails } from 'otplib';
import { getRemainingTime } from '@otplib/totp';

// Relax the minimum-secret-length guardrail so short (but valid) secrets
// that work in Google Authenticator are accepted by otplib v13.
const guardrails = createGuardrails({ MIN_SECRET_BYTES: 1 });

/**
 * Generates a current Google Authenticator (TOTP) code from a base32 secret.
 */
export function generateTOTP(secret: string): string {
  return generateSync({ secret, guardrails });
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
  return getRemainingTime();
}
