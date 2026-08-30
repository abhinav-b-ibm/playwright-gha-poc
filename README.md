# pivot-test-automation

End-to-end test automation for IBM webMethods Hybrid Integration with Playwright and TypeScript.

## Prerequisites

- Node.js

## Setup

Install dependencies and browsers:

```bash
npm install
npx playwright install chromium
```

## Environment variables
.env file will include all the reusable parameters 

## Running tests

| Command | What it does |
|---|---|
| `npm test` | Run all tests in Chromium |
| `npx playwright test --headed` | Run with the browser visible |
| `npx playwright test --ui` | Open the interactive Playwright UI runner |

## Reports

After a test run, open a report with:

| Report | Command | Output |
|---|---|---|
| Playwright HTML | `npx playwright show-report` | `playwright-report/` |
| Monocart | `npm run report:monocart` | `monocart-report/index.html` |

## Tech stack

- Playwright — browser automation and test runner
- TypeScript — type-safe test authoring
- Gherkin
- Monocart Reporter — rich HTML report with traces and screenshots
