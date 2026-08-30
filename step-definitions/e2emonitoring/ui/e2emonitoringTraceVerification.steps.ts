import { Then } from '../../../utils/fixtures';
import { WmioLoginPage } from '../../../pages/wmio/ui/WmioLoginPage';
import { E2EMonitoringTraceVerification } from '../../../pages/e2emonitoring/ui/E2EMonitoringTraceVerification';

Then(
  'the user navigates to E2E monitoring and verifies the transaction for API {string} and flowservice {string}',
  async ({ page }, apiName: string, flowserviceName: string) => {
    const loginPage = new WmioLoginPage(page);
    const e2eMonitoringTrace = new E2EMonitoringTraceVerification(page);

    await loginPage.goto();
    await loginPage.login(process.env.WMIO_USER!, process.env.WMIO_PASSWORD!);
    await e2eMonitoringTrace.verifyTransaction(process.env.E2EMON_URL!, apiName, flowserviceName);
  }
);
