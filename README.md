# pivot-test-automation

End-to-end test automation for IBM webMethods Hybrid Integration with Playwright and TypeScript.

## Prerequisites

- Node.js 18+

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
| `npx playwright test login.spec.ts` | Login smoke test only |
| `npx playwright test e2escenario1.spec.ts` | Full E2E scenario only |
| `npx playwright test --ui` | Open the interactive Playwright UI runner |

## Reports

After a test run, open a report with:

| Report | Command | Output |
|---|---|---|
| Playwright HTML | `npx playwright show-report` | `playwright-report/` |
| Monocart | `npm run report:monocart` | `monocart-report/index.html` |

## Project structure

```
pages/
  apigw/api/        # API Gateway HTTP clients
  wmio/api/         # webMethods.io API clients
  wmio/ui/          # Page objects for the wmio UI (login, E2E monitoring)
  common/ui/        # Shared page objects
tests/
  wmio/ui/          # UI test specs
utils/
  fixtures.ts       # Custom Playwright fixtures (pre-authenticated page)
  totp.ts           # TOTP/Google Authenticator code generator
```

## Tech stack

- Playwright — browser automation and test runner
- TypeScript — type-safe test authoring
- Monocart Reporter — rich HTML report with traces and screenshots
