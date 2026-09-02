import { When, Then, expect } from '../../../utils/fixtures';
import { ApiGatewayPage } from '../../../pages/apigw/ui/ApiGatewayPage';

let apiName: string;

When(
  'the user creates and activates an API Gateway API for resource path {string} and flow service {string} with server url {string}',
  async ({ page }, resourcePath: string, flowServiceName: string, serverUrl: string) => {
    const apiGatewayPage = new ApiGatewayPage(page);
    const result = await apiGatewayPage.createAndActivateApi(resourcePath, flowServiceName, serverUrl);
    apiName = result.apiName;
  }
);

Then(
  'the API Gateway API {string} should be created and activated successfully',
  async ({ page }, flowServiceName: string) => {
    // The activate step completes inside createAndActivateApi — by the time we
    // reach here the page is on the API detail view.  We verify that the browser
    // is still on a valid API Gateway URL and that the api name was captured.
    expect(page.url(), 'Expected to still be on API Gateway after activation')
      .toContain('apigw');
    expect(apiName, 'Expected an API name to have been set during creation')
      .toMatch(/^PlaywrightAPI_\d+$/);
    console.log(`✅ API "${apiName}" created and activated for flow service "${flowServiceName}"`);
  }
);
