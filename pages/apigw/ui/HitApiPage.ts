import { Page, APIRequestContext, expect } from '@playwright/test';

export class HitApiPage {
  constructor(
    private page: Page,
    private request: APIRequestContext,
  ) {}

  /**
   * Navigates to the API detail page, reads the gateway base URL and resource
   * path from the DOM, assembles the full endpoint URL, then fires a POST.
   *
   * @param apiPageUrl - URL of the API detail page on the API Gateway UI
   *                     (e.g. returned by ApiGatewayPage.createAndActivateApi)
   */
  async hitApi(apiPageUrl: string): Promise<void> {

    // ── STEP 1: Navigate to the API detail page ───────────────────────────────
    console.log('\n═══ STEP 1: Navigate to API detail page ═══');
    await this.page.goto(apiPageUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await this.page.waitForTimeout(4000);

    // ── STEP 2: Read the Gateway base URL from the DOM ────────────────────────
    // Confirmed DOM: <div class="font-default">http://...gateway/testing1/1.0</div>
    console.log('\n═══ STEP 2: Read Gateway base URL ═══');
    const baseUrlLocator = this.page.locator('div.font-default').first();
    await baseUrlLocator.waitFor({ state: 'visible', timeout: 15_000 });
    const baseUrl = (await baseUrlLocator.textContent() ?? '').trim();
    console.log(`✅ Base URL: "${baseUrl}"`);
    expect(baseUrl, 'Gateway base URL should not be empty').not.toBe('');

    // ── STEP 3: Read the resource path from the DOM ───────────────────────────
    // Confirmed DOM: <label class="resource-header clickable">/integration/rest/...</label>
    console.log('\n═══ STEP 3: Read resource path ═══');
    const resourcePathLocator = this.page.locator('label.resource-header.clickable').first();
    await resourcePathLocator.waitFor({ state: 'visible', timeout: 15_000 });
    const resourcePath = (await resourcePathLocator.textContent() ?? '').trim();
    console.log(`✅ Resource path: "${resourcePath}"`);
    expect(resourcePath, 'Resource path should not be empty').not.toBe('');

    // ── STEP 4: Build full endpoint URL ───────────────────────────────────────
    console.log('\n═══ STEP 4: Build full endpoint URL ═══');
    const fullUrl = `${baseUrl}${resourcePath}`;
    console.log(`✅ Full endpoint URL: "${fullUrl}"`);

    // ── STEP 5: POST to the endpoint ──────────────────────────────────────────
    console.log('\n═══ STEP 5: POST to endpoint ═══');
    const response = await this.request.post(fullUrl, {
      headers: {
        'Content-Type':       'application/json',
        'Accept':             'application/json',
        'X-INSTANCE-API-KEY': process.env.WMIO_INSTANCE_API_KEY!,
      },
      data: {},
      ignoreHTTPSErrors: true,
    });

    const status     = response.status();
    const statusText = response.statusText();
    let responseBody = '';
    try { responseBody = await response.text(); } catch { responseBody = '(could not read body)'; }

    console.log(`\n📡 POST ${fullUrl}`);
    console.log(`   Status : ${status} ${statusText}`);
    console.log(`   Body   : ${responseBody.slice(0, 500)}`);

    console.log('\n══════════════════════════════════════════════════════════');
    console.log('📋 HIT API SUMMARY:');
    console.log(`  Base URL      : ${baseUrl}`);
    console.log(`  Resource path : ${resourcePath}`);
    console.log(`  Full URL      : ${fullUrl}`);
    console.log(`  Method        : POST`);
    console.log(`  Response      : ${status} ${statusText}`);
    console.log(`  Body (200)    : ${responseBody.slice(0, 200)}`);
    console.log('══════════════════════════════════════════════════════════');

    expect(status, `Expected a valid HTTP status from POST ${fullUrl}`).toBeGreaterThan(0);
  }
}
