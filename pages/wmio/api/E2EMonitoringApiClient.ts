import { APIRequestContext } from '@playwright/test';

/**
 * Pure API client for the E2E Monitoring GraphQL endpoint.
 *
 * No browser / page required. Uses Playwright's APIRequestContext
 * (the `request` fixture) directly.
 *
 * Session flow:
 *   1. loginViaApi()        — POST credentials → receive JSESSIONID + e2em-ui cookie
 *   2. fetchTransactions()  — POST GraphQL with those cookies
 *
 * The app uses the double-submit cookie pattern for CSRF protection:
 * the `e2em-ui` cookie value is also sent as the `X-CSRF-Token` header.
 */
export class E2EMonitoringApiClient {

    private cookieHeader = '';
    private csrfToken    = '';

    constructor(
        private request: APIRequestContext,
        private baseUrl: string,          // e.g. 'https://prod476796.a-vir-c1.e2em.ipaas.preprod.automation.ibm.com'
    ) {}

    // ── Step 1: obtain a session via API login ──────────────────────────────
    // Sends credentials to the app's login endpoint and extracts the session
    // cookies from the Set-Cookie response headers.
    // Adjust the login URL / body shape to match the actual auth endpoint.
    async loginViaApi(username: string, password: string) {
        const response = await this.request.post(
            `${this.baseUrl}/e2emonitoring/integration/rest/uhm/login`,
            {
                headers: {
                    'accept':       'application/json',
                    'content-type': 'application/json',
                },
                data: { username, password },
            }
        );

        // Collect all Set-Cookie values from the login response
        const rawHeaders = response.headers();

        // Playwright returns multi-value headers joined by '\n'
        const setCookieRaw = rawHeaders['set-cookie'] ?? '';
        const setCookies   = setCookieRaw.split('\n').filter(Boolean);

        // Parse each cookie into name=value and collect them
        const cookiePairs: string[] = [];
        let e2emUiValue = '';

        for (const line of setCookies) {
            // A Set-Cookie line looks like: name=value; Path=/; HttpOnly; ...
            const nameValue = line.split(';')[0].trim();   // "name=value"
            cookiePairs.push(nameValue);

            // The CSRF token is the value of the e2em-ui cookie (double-submit pattern)
            if (nameValue.startsWith('e2em-ui=')) {
                e2emUiValue = nameValue.split('=').slice(1).join('=');
            }
        }

        this.cookieHeader = cookiePairs.join('; ');
        this.csrfToken    = e2emUiValue;

        console.log('Session cookies obtained:', cookiePairs.map(c => c.split('=')[0]).join(', '));
        console.log('CSRF token (e2em-ui)     :', this.csrfToken ? '✓ present' : '✗ not found');

        return response;
    }

    // ── Step 2: POST the GraphQL query with the live session ────────────────
    // Replace the operationName / query string with the exact payload from
    // DevTools → Network → graphql request → Payload tab.
    async fetchTransactions(apiName: string) {
        if (!this.cookieHeader) {
            throw new Error('No session cookies — call loginViaApi() before fetchTransactions()');
        }

        const graphqlPayload = {
            operationName: 'GetTransactions',
            variables: {
                filter: { apiName },
            },
            query: `query GetTransactions($filter: TransactionFilter) {
                transactions(filter: $filter) {
                    id
                    apiName
                    status
                    startTime
                    endTime
                }
            }`,
        };

        const response = await this.request.post(
            `${this.baseUrl}/e2emonitoring/integration/rest/uhm/graphql`,
            {
                headers: {
                    'accept':         'application/json',
                    'content-type':   'application/json',
                    'cookie':         this.cookieHeader,
                    'x-csrf-token':   this.csrfToken,
                    'origin':         this.baseUrl,
                    'referer':        `${this.baseUrl}/e2emonitoring/`,
                },
                data: graphqlPayload,
            }
        );

        const body = await response.json();
        console.log('GraphQL status:', response.status());
        console.log('GraphQL body  :', JSON.stringify(body, null, 2));

        return { response, body };
    }
}
