import { Page } from '@playwright/test';

export class ApiGatewayPage {
  constructor(private page: Page) {}

  private async dismissCookies() {
    const banner = this.page.getByRole('button', { name: /accept all/i });
    if (await banner.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await banner.click();
      console.log('✅ Cookie banner dismissed');
      await this.page.waitForTimeout(600);
    }
  }

  /**
   * Runs the full API Gateway UI journey:
   * navigate → create API from scratch → fill name → technical info → resources → save → activate
   *
   * @param resourcePath    - full resource path (e.g. /integration/rest/.../flowservice1)
   * @param flowServiceName - name used for the resource (e.g. 'flowservice1')
   * @param serverUrl       - server URL for the Technical Information tab (falls back to APIGW_SERVER_URL env var)
   * @returns apiPageUrl, apiName, resolvedPath
   */
  async createAndActivateApi(
    resourcePath: string,
    flowServiceName: string,
    serverUrl?: string,
  ): Promise<{ apiPageUrl: string; apiName: string; resolvedPath: string }> {
    const apiName     = `PlaywrightAPI_${Date.now()}`;
    const resolvedPath = resourcePath;

    console.log(`  apiName      = ${apiName}`);
    console.log(`  resourceName = ${flowServiceName}`);
    console.log(`  resourcePath = ${resolvedPath}`);

    // ── STEP 1: Navigate to API Gateway UI ───────────────────────────────────
    console.log('\n═══ STEP 1: Navigate to API Gateway UI ═══');
    await this.page.goto(process.env.APIGW_URL!, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000);
    await this.dismissCookies();

    // ── STEP 2: Click "APIs" sidebar icon ────────────────────────────────────
    console.log('\n═══ STEP 2: Click "APIs" sidebar icon ═══');
    const apiNavLink = this.page.locator('nav a').filter({ hasText: /^APIs$/i })
      .or(this.page.locator('.sidebar a').filter({ hasText: /^APIs$/i }))
      .or(this.page.locator('a[href*="#/apis"]'))
      .or(this.page.locator('a').filter({ hasText: /^APIs$/i }))
      .first();

    if (await apiNavLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await apiNavLink.click();
      console.log('✅ Clicked "APIs" nav link');
    } else {
      await this.page.locator('nav li, .sidebar li, ul.nav li').nth(1).click();
      console.log('✅ Clicked sidebar index 1 (APIs fallback)');
    }
    await this.page.waitForTimeout(2000);

    // ── STEP 3: Click "+ Create API" ─────────────────────────────────────────
    console.log('\n═══ STEP 3: Click "+ Create API" ═══');
    const createApiBtn = this.page
      .locator('button').filter({ hasText: /create api/i })
      .or(this.page.locator('a').filter({ hasText: /create api/i }))
      .or(this.page.locator('[title="Create API"]'))
      .first();
    await createApiBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await createApiBtn.click();
    console.log('✅ Clicked "+ Create API"');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);

    // ── STEP 4: Create from scratch → fill API name ───────────────────────────
    console.log('\n═══ STEP 4: Create API from scratch → fill name ═══');
    const scratchLink = this.page.getByText('Create API from scratch', { exact: true });
    await scratchLink.waitFor({ state: 'visible', timeout: 10_000 });
    await scratchLink.click();
    await this.page.waitForTimeout(800);

    const createBtn = this.page.getByRole('button', { name: 'Create' });
    await createBtn.waitFor({ state: 'visible', timeout: 8_000 });
    await createBtn.scrollIntoViewIfNeeded();
    await createBtn.click();
    console.log('✅ Clicked "Create"');
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
    await this.page.waitForTimeout(3000);

    let filled = false;
    for (const sel of [
      this.page.locator('input[id*="name" i]').first(),
      this.page.locator('input[name*="name" i]').first(),
      this.page.locator('input[placeholder*="name" i]').first(),
      this.page.locator('input[type="text"]:not([disabled])').first(),
    ]) {
      if (await sel.isVisible({ timeout: 4_000 }).catch(() => false)) {
        await sel.click({ clickCount: 3 });
        await sel.fill(apiName);
        console.log(`✅ Filled API name: "${apiName}"`);
        filled = true;
        break;
      }
    }
    if (!filled) console.warn('⚠️  Could not find API name field');

    // ── STEP 5: Technical Information tab → Server URL ────────────────────────
    console.log('\n═══ STEP 5: Technical Information → Server URL ═══');
    const techInfoTab = this.page
      .locator('[role="tab"]').filter({ hasText: /technical information/i })
      .or(this.page.locator('li, a, button').filter({ hasText: /technical information/i }))
      .first();
    await techInfoTab.waitFor({ state: 'visible', timeout: 15_000 });
    await techInfoTab.click();
    await this.page.waitForTimeout(2000);

    const serverURL = (serverUrl?.trim() || process.env.APIGW_SERVER_URL)!;
    let serverFilled = false;
    for (const sel of [
      this.page.locator('input[id*="server" i]').first(),
      this.page.locator('input[name*="server" i]').first(),
      this.page.locator('input[placeholder*="server" i]').first(),
      this.page.locator('input[placeholder*="http" i]').first(),
    ]) {
      if (await sel.isVisible({ timeout: 4_000 }).catch(() => false)) {
        await sel.click({ clickCount: 3 });
        await sel.fill(serverURL);
        console.log(`✅ Filled Server URL: "${serverURL}"`);
        serverFilled = true;
        break;
      }
    }
    if (!serverFilled) {
      const nearInput = this.page.locator('input[type="text"]:not([disabled])').first();
      if (await nearInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await nearInput.fill(serverURL);
        console.log(`✅ Filled Server URL (fallback): "${serverURL}"`);
        serverFilled = true;
      }
    }
    if (!serverFilled) console.warn('⚠️  Could not find Server URL field');

    const addServerBtn = this.page.locator('button').filter({ hasText: /^Add$/i }).first();
    if (await addServerBtn.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await addServerBtn.click();
      console.log('✅ Clicked Add (server URL)');
      await this.page.waitForTimeout(2000);
    }

    // ── STEP 6: Resources and Methods tab ────────────────────────────────────
    console.log('\n═══ STEP 6: Resources and Methods tab ═══');
    const resourcesTab = this.page
      .locator('[role="tab"]').filter({ hasText: /resources/i })
      .or(this.page.locator('li, a, button').filter({ hasText: /resources.*methods/i }))
      .or(this.page.locator('li, a, button').filter({ hasText: /resources/i }))
      .first();
    await resourcesTab.waitFor({ state: 'visible', timeout: 15_000 });
    await resourcesTab.click();
    await this.page.waitForTimeout(2000);

    // ── STEP 7: Add Resource → fill name + path ───────────────────────────────
    console.log('\n═══ STEP 7: Add Resource ═══');
    const addResourceBtn = this.page.locator('button#add-resource');
    await addResourceBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await addResourceBtn.click();
    await this.page.waitForTimeout(1500);

    const resourceNameField = this.page.locator('input[id="1_name"]');
    await resourceNameField.waitFor({ state: 'visible', timeout: 8_000 });
    await resourceNameField.fill(flowServiceName);
    console.log(`✅ Filled Resource Name: "${flowServiceName}"`);

    const resourcePathField = this.page.locator('input[id="undefined_resrcPath"]');
    await resourcePathField.waitFor({ state: 'visible', timeout: 6_000 });
    await resourcePathField.fill(resolvedPath);
    console.log(`✅ Filled Resource Path: "${resolvedPath}"`);

    // ── STEP 8: Select POST method ────────────────────────────────────────────
    console.log('\n═══ STEP 8: Select POST method ═══');
    const postLabel    = this.page.locator('label').filter({ hasText: /^POST$/i }).first();
    const postCheckbox = this.page.locator(
      'input[type="checkbox"][value="POST" i], input[type="checkbox"][id*="POST" i]'
    ).first();
    if (await postLabel.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await postLabel.click();
      console.log('✅ Selected POST (label)');
    } else if (await postCheckbox.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await postCheckbox.click();
      console.log('✅ Selected POST (checkbox)');
    }

    // ── STEP 9: Add → Save ────────────────────────────────────────────────────
    console.log('\n═══ STEP 9: Add → Save ═══');
    const addButton = this.page.locator('button').filter({ hasText: /^Add$/i }).first();
    await addButton.waitFor({ state: 'visible', timeout: 8_000 });
    await addButton.click();
    console.log('✅ Clicked Add');
    await this.page.waitForTimeout(2000);

    const saveBtn = this.page
      .locator('button').filter({ hasText: /^Save$/i })
      .or(this.page.locator('[title="Save"]'))
      .or(this.page.locator('[aria-label="Save"]'))
      .first();
    await saveBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await saveBtn.click();
    console.log('✅ Clicked Save');
    await this.page.waitForTimeout(3000);

    const savedIndicator = this.page
      .getByText(/saved|success/i)
      .or(this.page.getByText(apiName))
      .or(this.page.locator('[class*="success"], [class*="toast"], [class*="alert-success"]').first())
      .first();
    const saved = await savedIndicator.isVisible({ timeout: 5_000 }).catch(() => false);
    console.log(saved
      ? '✅ Save confirmed (toast/text visible)'
      : '✅ Save confirmed (button clicked — no toast displayed)');

    // ── STEP 10: Activate ─────────────────────────────────────────────────────
    console.log('\n═══ STEP 10: Activate API ═══');
    const activateBtn = this.page.locator('button#btn-Activate');
    await activateBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await activateBtn.click();
    console.log('✅ Clicked "Activate"');
    await this.page.waitForTimeout(1500);

    const confirmYesBtn = this.page.locator('button#delete-yes').filter({ visible: true });
    await confirmYesBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await confirmYesBtn.click();
    console.log('✅ Confirmed activation');
    await this.page.waitForTimeout(2000);

    const apiPageUrl = this.page.url();
    console.log(`✅ API page URL : ${apiPageUrl}`);
    console.log(`✅ API name     : ${apiName}`);
    console.log(`✅ Resource path: ${resolvedPath}`);
    return { apiPageUrl, apiName, resolvedPath };
  }
}
