import { test, expect } from '@playwright/test';
import { ProjectPage } from '../../../pages/wmio/api/ProjectPage';
import { FlowservicePage } from '../../../pages/wmio/api/FlowservicePage';

const params = {
    wmioURL:         process.env.WMIO_URL!,
    flowserviceName: "logCustomFlow",
    projectName:     "pivotTestProject"
};

let projectPage: ProjectPage;
let flowservicePage: FlowservicePage;

test.beforeEach(({ request }) => {
    projectPage = new ProjectPage(request);
    flowservicePage = new FlowservicePage(request);
});

test("Create project, flowservice, execute and verify", async () => {
    await test.step("Create project for the test", async () => {
        const response = await projectPage.createProject(params.wmioURL, params.projectName);
        const body = await response.text();
        expect(response.ok(), `[Create project] Failed for "${params.projectName}" — HTTP ${response.status()}: ${body}`).toBeTruthy();
    });

    await test.step("Create flowservice in the project", async () => {
        const projectID = await projectPage.getProjectID(params.wmioURL, params.projectName);
        const response = await flowservicePage.createFlowservice(params.wmioURL, projectID, params.flowserviceName);
        const body = await response.text();
        expect(response.ok(), `[Create flowservice] Failed for "${params.flowserviceName}" in project "${params.projectName}" — HTTP ${response.status()}: ${body}`).toBeTruthy();
    });

    await test.step("Execute flowservice in the project", async () => {
        const projectID = await projectPage.getProjectID(params.wmioURL, params.projectName);
        const response = await flowservicePage.executeFlowserviceViaAPI(params.wmioURL, projectID, params.flowserviceName);
        const body = await response.text();
        expect(response.ok(), `[Execute flowservice] Failed for "${params.flowserviceName}" (projectID: ${projectID}) — HTTP ${response.status()}: ${body}`).toBeTruthy();
    });

    await test.step("Execute flowservice in the project", async () => {
        const projectID = await projectPage.getProjectID(params.wmioURL, params.projectName);
        const response = await flowservicePage.executeFlowserviceViaAPI(params.wmioURL, projectID, params.flowserviceName);
        const body = await response.text();
        expect(response.ok(), `[Execute flowservice] Failed for "${params.flowserviceName}" (projectID: ${projectID}) — HTTP ${response.status()}: ${body}`).toBeTruthy();
    });
});
