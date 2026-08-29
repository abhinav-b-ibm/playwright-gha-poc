import { Given, When, Then, expect } from '../../../utils/fixtures';
import { ProjectPage } from '../../../pages/wmio/api/ProjectPage';
import { FlowservicePage } from '../../../pages/wmio/api/FlowservicePage';
import { APIResponse } from '@playwright/test';

const wmioURL = process.env.WMIO_URL!;

let projectPage: ProjectPage;
let flowservicePage: FlowservicePage;
let executionResponse: APIResponse;

Given('the project named {string} is deleted if it already exists', async ({ request, $testInfo }, projectName: string) => {
  projectPage = new ProjectPage(request);
  flowservicePage = new FlowservicePage(request);

  const deleteResponse = await projectPage.deleteProjectIfExists(wmioURL, projectName);
  if (deleteResponse) {
    const json = await deleteResponse.json();
    expect(json.output.message).toBe('Project deleted successfully.');
  }
});

Given('a project named {string} is created', async ({ request, $testInfo }, projectName: string) => {
  if (!projectPage) projectPage = new ProjectPage(request);
  if (!flowservicePage) flowservicePage = new FlowservicePage(request);

  const response = await projectPage.createProject(wmioURL, projectName);
  const body = await response.text();

  await $testInfo.attach(`Create Project Response - ${projectName}`, {
    body,
    contentType: 'application/json',
  });

  expect(
    response.ok(),
    `[Create project] Failed for "${projectName}" — HTTP ${response.status()}: ${body}`
  ).toBeTruthy();
});

Given('a flowservice named {string} is created in project {string}', async ({ request, $testInfo }, flowserviceName: string, projectName: string) => {
  if (!projectPage) projectPage = new ProjectPage(request);
  if (!flowservicePage) flowservicePage = new FlowservicePage(request);

  const projectID = await projectPage.getProjectID(wmioURL, projectName);
  const response = await flowservicePage.createFlowservice(wmioURL, projectID, flowserviceName);
  const body = await response.text();

  await $testInfo.attach(`Create Flowservice Response - ${flowserviceName}`, {
    body,
    contentType: 'application/json',
  });

  expect(
    response.ok(),
    `[Create flowservice] Failed for "${flowserviceName}" in project "${projectName}" — HTTP ${response.status()}: ${body}`
  ).toBeTruthy();
});

When('the flowservice {string} in project {string} is executed', async ({ request, $testInfo }, flowserviceName: string, projectName: string) => {
  if (!projectPage) projectPage = new ProjectPage(request);
  if (!flowservicePage) flowservicePage = new FlowservicePage(request);

  const projectID = await projectPage.getProjectID(wmioURL, projectName);
  executionResponse = await flowservicePage.executeFlowserviceViaAPI(wmioURL, projectID, flowserviceName);
  const body = await executionResponse.text();

  await $testInfo.attach(`Execute Flowservice Response - ${flowserviceName}`, {
    body,
    contentType: 'application/json',
  });

  expect(
    executionResponse.ok(),
    `[Execute flowservice] Failed for "${flowserviceName}" (projectID: ${projectID}) — HTTP ${executionResponse.status()}: ${body}`
  ).toBeTruthy();
});

Then('the flowservice execution should be successful', async ({ $testInfo }) => {
  expect(executionResponse).toBeDefined();
  expect(executionResponse.ok()).toBeTruthy();

  const body = await executionResponse.text();
  await $testInfo.attach('Flowservice Execution Final Result', {
    body,
    contentType: 'application/json',
  });
});
