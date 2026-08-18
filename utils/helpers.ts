/**
 * Shared utility functions used across all test projects.
 * Keep these pure (no Playwright imports) — they should be
 * simple data helpers, not page interactions.
 */

/**
 * Returns a timestamp string suitable for unique test data.
 * Example: "20250115-143022"
 */
export function timestamp(): string {
  return new Date().toISOString().replace(/[-T:]/g, '').slice(0, 15).replace('T', '-');
}

/**
 * Pauses execution for the given number of milliseconds.
 * Prefer Playwright's built-in waitFor methods over this where possible.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
