import { APIRequestContext } from '@playwright/test';
import { requestWithSessionRefresh } from '../../../pages/wmio/api/WmioSession';

export class ProjectPage {
    constructor(private readonly requestContext: APIRequestContext) {}

    async createProject(wmioURL: string, projectName: string) {
        return requestWithSessionRefresh('POST', this.requestContext, `${wmioURL}/apis/v1/rest/projects`, { name: projectName }, undefined, 'application/json', 'instance-key');
    }

    async getProjectID(wmioURL: string, projectName: string) {
        const response = await requestWithSessionRefresh('GET', this.requestContext, `${wmioURL}/apis/v1/rest/projects/${projectName}`, undefined, undefined, 'application/json', 'instance-key');
        const body = await response.json();
        return body.output.uid;
    }

    // async deleteProject(wmioURL: string, projectId: string) {
    //     return requestWithSessionRefresh('DELETE', this.requestContext, `${wmioURL}/apis/v1/rest/projects/${projectId}`);
    // }
}