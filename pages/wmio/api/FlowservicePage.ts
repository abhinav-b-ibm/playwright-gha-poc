import { APIRequestContext } from '@playwright/test';
import { requestWithSessionRefresh } from '../../../pages/wmio/api/WmioSession';
import * as fs from 'fs';
import * as path from 'path';

export class FlowservicePage {
    constructor(private readonly requestContext: APIRequestContext) {}

    async createFlowservice(wmioURL: string, projectID: string, flowserviceName: string) {
        const raw = fs.readFileSync(path.join(__dirname, '../../../tests/data/wmio/api/create-flow-payload.json'), 'utf-8')
            .replaceAll('{{flow_name}}',    flowserviceName)
            .replaceAll('{{commit_email}}', process.env.WMIO_USER ?? 'automation@ibm.com');
        const payload = JSON.parse(raw);

        return requestWithSessionRefresh('POST', this.requestContext, `${wmioURL}/integration/rest/ut-flow/flowservice/${projectID}/${flowserviceName}`, payload, undefined, 'application/json', 'session');
    }

    async executeFlowserviceViaAPI(wmioURL: string, projectName: string, flowserviceName: string) {
        const payload = `<?xml version="1.0" encoding="UTF-8"?>\n<Values version="2.0"/>`;
        return requestWithSessionRefresh('POST', this.requestContext,
            `${wmioURL}/integration/rest/assembly/run/${flowserviceName}`, payload, { projectName: projectName }, 'application/xml', 'session');
    }

    async deleteFlowservice(wmioURL: string, projectName: string, flowserviceName: string) {
        return requestWithSessionRefresh('DELETE', this.requestContext, `${wmioURL}/integration/rest/ut-flow/flowservice/${flowserviceName}`, undefined, { project: projectName });
    }
}