import { test, expect } from '@playwright/test';

test.describe('Execute API from API Gateway and verify the transaction in E2E monitoring page', () => {
  test('Execute API from API Gateway', async ({ request }) => {
    const response = await request.post(
        'http://prod476796.a-vir-s1.apigw.ipaas.preprod.automation.ibm.com/gateway/testing1/1.0/integration/rest/external/integration/run/development/fl5bad7662057f4ffcb1e2be9d3252bf17/test1',
        {
        headers: {
            'X-INSTANCE-API-KEY': process.env.WMIO_INSTANCE_API_KEY!,
        },
        }
    );
    const body = await response.text();
    console.log('Status:', response.status());
    console.log('Status Text:', response.statusText());
    console.log('Body:', body);
    expect(response.ok()).toBeTruthy();
    });

    test('Verify execution in E2E monitoring page', async() => {

    });
});
