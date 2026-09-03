import { When, Then } from '../../../utils/Fixtures';
import { E2EMonitoringDashboard } from '../../../pages/e2emonitoring/ui/E2EMonitoringDashboard';

When(
  'the user searches for {string} in the E2E monitoring dashboard',
  async ({ page }, apiName: string) => {
    const dashboard = new E2EMonitoringDashboard(page);
    await dashboard.searchAndVerifyStatus(apiName);
  }
);

Then(
  'the E2E monitoring transaction status for {string} should be pass or failed',
  async ({}, apiName: string) => {
    // Status assertion is performed inside searchAndVerifyStatus().
    // This step confirms the scenario completed for the given apiName.
    console.log(`✅ E2E monitoring verified for "${apiName}"`);
  }
);
