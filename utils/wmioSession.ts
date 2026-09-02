/**
 * wmioSession.ts
 *
 * Manages the WMIO API session used by ProjectPage and FlowservicePage.
 * The session is acquired once (via username + password login to the WMIO
 * REST API) and persisted to .wmio-session.json on disk.
 * Subsequent calls to requestWithSessionRefresh() reuse the cached token,
 * refreshing automatically when a 401 is returned.
 *
 * This is separate from the browser session (storageState / .auth/session.json)
 * which is managed by auth.setup.spec.ts for UI tests.
 */

import { APIRequestContext, request as playwrightRequest } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SESSION_FILE = path.resolve(__dirname, '../.wmio-session.json');

interface WmioSession {
  cookie:    string;
  authtoken: string;
  csrf:      string;
}

// ── In-memory cache — avoids re-reading the file on every request ────────────
let cached: WmioSession | null = null;

function readSession(): WmioSession | null {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const raw = fs.readFileSync(SESSION_FILE, 'utf-8');
      return JSON.parse(raw) as WmioSession;
    }
  } catch {
    // corrupt file — treat as missing
  }
  return null;
}

function writeSession(session: WmioSession): void {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), 'utf-8');
  cached = session;
}

/**
 * Logs in to WMIO via the REST API and writes the resulting session tokens
 * to .wmio-session.json.  Called once from global-setup.ts.
 */
async function login(): Promise<WmioSession> {
  const wmioURL  = process.env.WMIO_URL!;
  const user     = process.env.WMIO_USER!;
  const password = process.env.WMIO_PASSWORD!;

  if (!wmioURL || !user || !password) {
    throw new Error(
      'WMIO_URL, WMIO_USER and WMIO_PASSWORD must all be set in .env before running tests.'
    );
  }

  console.log('[wmioSession] Logging in to acquire session tokens...');

  const ctx = await playwrightRequest.newContext();
  try {
    const response = await ctx.post(`${wmioURL}/rest/ut/login`, {
      headers: { 'Content-Type': 'application/json' },
      data: { user_name: user, password },
    });

    if (!response.ok()) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `[wmioSession] Login failed — HTTP ${response.status()}: ${body}`
      );
    }

    // Extract session cookie from Set-Cookie header
    const setCookie = response.headers()['set-cookie'] ?? '';
    const cookieMatch = setCookie.match(/(JSESSIONID=[^;]+(?:;[^;]*route=[^;]+)?)/i)
      ?? setCookie.match(/(JSESSIONID=[^;\s]+)/i);
    const cookie = cookieMatch ? cookieMatch[1] : '';

    const body = await response.json();
    const authtoken = body?.user_token ?? body?.token ?? '';
    const csrf      = body?.csrf_token ?? response.headers()['x-csrf-token'] ?? '';

    if (!authtoken) {
      throw new Error('[wmioSession] Login succeeded but no auth token found in response.');
    }

    const session: WmioSession = { cookie, authtoken, csrf };
    writeSession(session);
    console.log('[wmioSession] Session acquired and saved to .wmio-session.json');
    return session;
  } finally {
    await ctx.dispose();
  }
}

/**
 * Called from global-setup.ts.
 * If a valid session file already exists, skips the login network call.
 * Otherwise logs in and saves the session.
 */
export async function ensureSession(): Promise<void> {
  const existing = readSession();
  if (existing?.authtoken) {
    cached = existing;
    console.log('[wmioSession] Reusing existing session from .wmio-session.json');
    return;
  }
  await login();
}

/**
 * Builds the Authorization / session headers for an API request.
 * authMode:
 *   'session'      → JSESSIONID cookie + X-Auth-Token header (WMIO internal APIs)
 *   'instance-key' → X-INSTANCE-API-KEY header only (public-facing WMIO REST APIs)
 */
function buildHeaders(
  authMode: 'session' | 'instance-key',
  contentType: string,
  session: WmioSession,
): Record<string, string> {
  const base: Record<string, string> = {
    'Content-Type': contentType,
    'Accept':       'application/json',
  };

  if (authMode === 'session') {
    if (session.cookie)    base['Cookie']        = session.cookie;
    if (session.authtoken) base['X-Auth-Token']  = session.authtoken;
    if (session.csrf)      base['X-CSRF-Token']  = session.csrf;
  } else {
    const instanceKey = process.env.WMIO_INSTANCE_API_KEY!;
    if (!instanceKey) {
      throw new Error('WMIO_INSTANCE_API_KEY must be set in .env for instance-key auth mode.');
    }
    base['X-INSTANCE-API-KEY'] = instanceKey;
  }

  return base;
}

/**
 * Executes an API request using the current session.
 * If the server returns 401 (session expired), re-logs in once and retries.
 *
 * @param method       - HTTP method (GET, POST, PUT, DELETE)
 * @param ctx          - Playwright APIRequestContext from the test fixture
 * @param url          - Full URL to call
 * @param data         - Request body (object or string)
 * @param params       - Query parameters
 * @param contentType  - Content-Type header value (default: 'application/json')
 * @param authMode     - 'session' | 'instance-key'
 */
export async function requestWithSessionRefresh(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  ctx: APIRequestContext,
  url: string,
  data?: unknown,
  params?: Record<string, string>,
  contentType = 'application/json',
  authMode: 'session' | 'instance-key' = 'session',
) {
  // Ensure session is loaded
  if (!cached) {
    cached = readSession();
    if (!cached?.authtoken) {
      await login();
      cached = readSession()!;
    }
  }

  const doRequest = async (session: WmioSession) => {
    const headers = buildHeaders(authMode, contentType, session);
    const options: Parameters<typeof ctx.get>[1] = { headers, params };
    if (data !== undefined) {
      (options as Record<string, unknown>)['data'] = data;
    }

    switch (method) {
      case 'GET':    return ctx.get(url, options);
      case 'POST':   return ctx.post(url, options);
      case 'PUT':    return ctx.put(url, options);
      case 'DELETE': return ctx.delete(url, options);
    }
  };

  let response = await doRequest(cached);

  // On 401 — session expired: re-login once and retry
  if (response.status() === 401 && authMode === 'session') {
    console.warn('[wmioSession] 401 received — session expired, re-logging in...');
    cached = await login();
    response = await doRequest(cached);
  }

  return response;
}
