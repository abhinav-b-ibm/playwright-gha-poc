import { Page, expect } from '@playwright/test';

export class E2EMonitoringDashboard {
  constructor(private page: Page) {}

  /**
   * Navigates to the E2E Monitoring dashboard, searches for the given apiName,
   * clicks the first result row and reads the transaction status.
   *
   * @param apiName - API / flow service name to search for
   */
  async searchAndVerifyStatus(apiName: string): Promise<void> {

    // ── STEP 1: Navigate to dashboard ────────────────────────────────────────
    console.log('\n═══ STEP 1: Navigate to E2E Monitoring dashboard ═══');
    const dashboardUrl = process.env.E2EMON_URL!;
    await this.page.goto(dashboardUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await this.page.waitForTimeout(5000);

    // ── Dismiss cookie banner ─────────────────────────────────────────────────
    const acceptCookies = this.page.locator('button', { hasText: /accept all/i });
    if (await acceptCookies.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await acceptCookies.click();
      console.log('✅ Dismissed cookie consent banner');
      await this.page.waitForTimeout(1500);
    }

    // ── STEP 2: Search ────────────────────────────────────────────────────────
    console.log(`\n═══ STEP 2: Search for "${apiName}" ═══`);
    await this.page.evaluate(() => window.scrollBy(0, 600));
    await this.page.waitForTimeout(500);

    const txTable   = this.page.locator('app-transaction-table').first();
    const txVisible = await txTable.isVisible({ timeout: 8_000 }).catch(() => false);
    if (txVisible) {
      await txTable.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(500);
    }

    const searchInput = txVisible
      ? txTable.locator('#input_search_textbox').first()
      : this.page.locator('#input_search_textbox[placeholder="Search"]').first();

    await searchInput.scrollIntoViewIfNeeded();
    await searchInput.waitFor({ state: 'visible', timeout: 15_000 });
    await searchInput.click();
    await searchInput.fill(apiName);
    console.log(`✅ Typed "${apiName}"`);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(4000);

    // ── STEP 3: Click first result row ───────────────────────────────────────
    console.log('\n═══ STEP 3: Click first result row ═══');
    const nameLink = this.page.getByText(apiName, { exact: true }).first();
    if (await nameLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameLink.click();
      console.log(`✅ Clicked "${apiName}" link`);
    } else {
      // JS fallback — click first visible <tr>
      await this.page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr')) as HTMLElement[];
        const visible = rows.find(r => r.offsetParent !== null && r.offsetHeight > 0);
        if (visible) visible.click();
      });
      console.log('✅ Clicked first visible row (JS fallback)');
    }

    // ── STEP 4: Read Status ───────────────────────────────────────────────────
    console.log('\n═══ STEP 4: Read Status ═══');
    await this.page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await this.page.waitForTimeout(4000);

    let statusResult = 'unknown';

    // Strategy 1: find the status <td> cell directly
    const statusValueCell = this.page
      .locator('td')
      .filter({ hasText: /^(Success|success|Pass|pass|Failed|failed|Error|error)$/ })
      .first();
    const statusCellVisible = await statusValueCell.isVisible({ timeout: 8_000 }).catch(() => false);

    if (statusCellVisible) {
      const cellText = (await statusValueCell.textContent() ?? '').trim();
      console.log(`ℹ️  Status cell text: "${cellText}"`);
      const lower = cellText.toLowerCase();
      statusResult = lower.includes('success') || lower.includes('pass') ? 'pass'
        : lower.includes('fail') || lower.includes('error') ? 'failed'
        : cellText;
    } else {
      // Strategy 2: scan full body text for pass/fail keywords
      const bodyText = await this.page.locator('body').innerText().catch(() => '');
      console.log(`ℹ️  Body text (first 400 chars): "${bodyText.slice(0, 400)}"`);
      const lower = bodyText.toLowerCase();
      statusResult = lower.includes('success') || lower.includes('pass') ? 'pass'
        : lower.includes('failed') || lower.includes('error') ? 'failed'
        : 'unknown';
    }

    console.log('\n══════════════════════════════════════════════════════════');
    console.log('📋 E2E MONITORING SUMMARY:');
    console.log(`  Searched : ${apiName}`);
    console.log(`  Status   : ${statusResult.toUpperCase()}`);
    console.log('══════════════════════════════════════════════════════════');

    expect(
      ['pass', 'failed'].some(s => statusResult.toLowerCase().includes(s)),
      `Expected Status to be "pass" or "failed", got: "${statusResult}"`
    ).toBe(true);
  }
}
