import { request } from '@playwright/test';

export class InvokeAPIGatewayEndpoints {

    async invokeAPI(apigwURL: string, apiName: string, apiVersion: string, flowserviceName: string, projectID: string) {
        const context = await request.newContext();
        const response = await context.post(
            apigwURL + '/' + apiName + '/' + apiVersion + '/integration/rest/external/integration/run/development/' + projectID + '/' + flowserviceName,
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
        return response;
    }
}