import { test, expect } from '@playwright/test';
import { WmioLoginPage } from '../../../pages/wmio/ui/WmioLoginPage';
import { E2EMonitoringPage } from '../../../pages/wmio/ui/E2EMonitoringPage';
import { InvokeAPIGatewayEndpoints } from '../../../pages/apigw/api/InvokeAPIGatewayEndpoint';

test.describe('Execute API from API Gateway and verify the transaction in E2E monitoring page', () => {
  const params = {
    apigwURL:        "http://prod476796.a-vir-s1.apigw.ipaas.preprod.automation.ibm.com/gateway/",
    apiName:         "testing1",
    apiVersion:      "1.0",
    flowserviceName: "test1",
    projectID:       "fl5bad7662057f4ffcb1e2be9d3252bf17",
    e2eMonURL:       process.env.E2EMON_URL!,

  };
  test("Execute API from API Gateway and verify the transaction in E2E monitoring page", async({page}) => {
    await test.step('Execute API from API Gateway', async () => {
        const invokeAPIPage = new InvokeAPIGatewayEndpoints();
        const response = await invokeAPIPage.invokeAPI(params.apigwURL, params.apiName, params.apiVersion, params.flowserviceName, params.projectID);
        expect(response.ok()).toBeTruthy();
    });
    await test.step('Verify execution in E2E monitoring page', async() => {
        const loginPage = new WmioLoginPage(page);
        const e2emonitoringpage = new E2EMonitoringPage(page);
        await loginPage.goto();
        await loginPage.login(process.env.WMIO_USER!, process.env.WMIO_PASSWORD!);
        await e2emonitoringpage.verifyTransaction(params.e2eMonURL, params.apiName, params.flowserviceName);
    });
  });
});
