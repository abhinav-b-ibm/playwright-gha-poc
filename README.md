# pivot-test-automation

End-to-end test automation for PIVOT team with Playwright and TypeScript, Playwright-bdd, Playwright API.

## Prerequisites

- Install [Node.js](https://nodejs.org/en) (v18+)
- Under VS Code IDE:
  - Install the **Playwright** extension: open Extensions (`Ctrl+Shift+X`), search for `Playwright`, then `Ctrl+Shift+P` → `Install Playwright` and keep the default checkboxes selected
  - Install the **Cucumber** extension: open Extensions (`Ctrl+Shift+X`) and search for `Cucumber`

## Setup

Install dependencies and browsers:

```bash
npm install
npx playwright install chromium
npx bddgen
````

## Environment variables

This project uses a .env file for environment-specific configuration such as URLs, usernames, passwords, and API tokens.

Do not commit actual environment values or sensitive credentials to the repository.
A template file may be committed with empty placeholder values only.
Example:
BASE_URL=

Create your local .env file and provide the required values before execution.
Add .env to .gitignore to prevent accidental commits of sensitive information.

## Running tests

| Command | What it does |
|---|---|
| `npm test` | Run all tests |
| `npm run test:bdd` | Generate BDD files and run BDD tests only |
| `npm run test:bdd:tags -- "@smoke"` | Run BDD tests filtered by tag (e.g. `@smoke`) |
| `npx playwright test --headed` | Run with the browser visible |
| `npx playwright test --ui` | Open the interactive Playwright UI runner |

```
> **Note:** Run `npx bddgen` after every `.feature` file change if not using `npm run test:bdd` (which runs it automatically).
```

## Project structure

```
tests/features/          # Gherkin .feature files
step-definitions/        # Given/When/Then step implementations
pages/                   # Page Object Model classes
utils/                   # Fixtures, helpers, session management
```

## Reports

After a test run, open a report with:

| Report | Command | Output |
|---|---|---|
| Playwright HTML | `npx playwright show-report` | `playwright-report/` |
| Monocart | `npm run report:monocart` | `monocart-report/index.html` |

## Tech stack

- **Playwright** — browser automation and test runner
- **playwright-bdd** — BDD layer connecting Gherkin to Playwright
- **TypeScript** — type-safe test authoring
- **otplib** — Google Authenticator TOTP code generation for login
- **Monocart Reporter** — rich single-file HTML report with traces and screenshots
