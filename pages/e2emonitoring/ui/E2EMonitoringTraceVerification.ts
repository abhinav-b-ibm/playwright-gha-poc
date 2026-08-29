import { Page, expect } from '@playwright/test';

export class E2EMonitoringTraceVerification {
    constructor(private page: Page) {}

    async verifyTransaction(e2eMonURL: string, apiName: string, flowserviceName: string) {
        await this.page.getByRole('button', { name: 'Open menu' }).click();
        await this.page.locator('cds-custom-side-nav-menu-item').filter({ hasText: 'End-to-end monitoring' }).click();

        // Wait for the sidebar navigation to finish
        await this.page.waitForURL(/e2e|monitoring/i, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);

        // Wait for the Search box AND for the page's initial data load spinner to finish
        // before searching — the table only renders after the initial fetch completes
        await this.page.getByRole('textbox', { name: 'Search' }).waitFor({ state: 'visible', timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 });

        await this.page.getByRole('textbox', { name: 'Search' }).click();
        await this.page.getByRole('textbox', { name: 'Search' }).fill(apiName);
        await this.page.getByRole('textbox', { name: 'Search' }).press('Enter');

        // Wait for search results to load before looking for the row
        await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 });
        const firstRow = this.page.locator('#table_transaction_table_name_' + apiName).first();
        await firstRow.waitFor({ state: 'visible', timeout: 30000 });
        await firstRow.click();
        await expect(this.page.locator('text.node-name').filter({ hasText: apiName }).first()).toBeVisible();
        await expect(this.page.locator('text.node-name').filter({ hasText: flowserviceName + ' (FS)' }).first()).toBeVisible();
    }
}
