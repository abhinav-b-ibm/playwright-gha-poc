import { When, expect } from '../../../utils/fixtures';
import { InvokeAPIGatewayEndpoints } from '../../../pages/apigw/api/InvokeAPIGatewayEndpoint';
import { ProjectPage } from '../../../pages/wmio/api/ProjectPage';

When(
  'the user executes API {string} version {string} for flowservice {string} in project {string} and tenant {string} via gateway {string}',
  async ({ request, $testInfo }, apiName: string, apiVersion: string, flowserviceName: string, projectName: string, wmioURL: string, apigwURL: string) => {
    const invokeAPIPage = new InvokeAPIGatewayEndpoints();
    const projectPage = new ProjectPage(request);
    const projectID = projectPage.getProjectID(process.env[wmioURL]!, projectName)
    const response = await invokeAPIPage.invokeAPI(apigwURL, apiName, apiVersion, flowserviceName, await projectID);
    const body = await response.text();

    await $testInfo.attach(`Gateway Invoke Response - ${apiName}`, {
      body,
      contentType: 'application/json',
    });

    expect(
      response.ok(),
      `[Invoke API Gateway] Failed for "${apiName}" — HTTP ${response.status()}: ${body}`
    ).toBeTruthy();
  }
);

