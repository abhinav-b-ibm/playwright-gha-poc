import { APIRequestContext, APIResponse, request } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export type WmioSession = {
    cookie: string;
    authtoken: string;
    csrf: string;
};

const sessionPath = path.resolve(__dirname, '../../../.wmio-session.json');

async function createSession(): Promise<WmioSession> {
    const baseUrl = process.env.WMIO_URL;
    const instanceKey = process.env.WMIO_INSTANCE_API_KEY;

    if (!baseUrl) throw new Error('[WmioSession] WMIO_URL is not set in .env');
    if (!instanceKey) throw new Error('[WmioSession] WMIO_INSTANCE_API_KEY is not set in .env');

    const context = await request.newContext({ baseURL: baseUrl });

    try {
        const tokenResponse = await context.get('/enterprise/v1/user/token', {
            headers: {
                accept: 'application/json',
                'X-INSTANCE-API-KEY': instanceKey,
            },
        });

        if (tokenResponse.status() !== 200) {
            throw new Error(`[WmioSession] Token request failed — HTTP ${tokenResponse.status()}: ${await tokenResponse.text()}`);
        }

        const tokenBody = await tokenResponse.json();
        const session = {
            cookie: tokenBody?.output?.cookie ?? '',
            authtoken: tokenBody?.output?.authtoken ?? '',
            csrf: tokenBody?.output?.csrf ?? '',
        };

        fs.writeFileSync(sessionPath, JSON.stringify(session), 'utf-8');
        return session;
    } finally {
        await context.dispose();
    }
}

export function loadSession(): WmioSession {
    return JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
}

export async function ensureSession(): Promise<WmioSession> {
    if (fs.existsSync(sessionPath)) {
        return loadSession();
    }

    return createSession();
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type AuthMode = 'session' | 'instance-key';

function isAuthFailure(response: APIResponse, body: string): boolean {
    if (response.status() === 401 || response.status() === 403) {
        return true;
    }

    return response.status() === 400 && body.includes('Access Denied');
}

export async function requestWithSessionRefresh(
    method: HttpMethod,
    requestContext: APIRequestContext,
    url: string,
    data?: unknown,
    params?: Record<string, string | number>,
    contentType: 'application/json' | 'application/xml' = 'application/json',
    authMode: AuthMode = 'session',
): Promise<APIResponse> {
    const contentTypeHeader = contentType === 'application/xml' ? 'application/xml; charset=UTF-8' : 'application/json';

    // --- instance-key auth: no session, no retry ---
    if (authMode === 'instance-key') {
        const instanceKey = process.env.WMIO_INSTANCE_API_KEY;
        if (!instanceKey) throw new Error('[WmioSession] WMIO_INSTANCE_API_KEY is not set in .env');

        return requestContext[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](url, {
            headers: {
                'Content-Type': contentTypeHeader,
                Accept: contentTypeHeader,
                'X-INSTANCE-API-KEY': instanceKey,
            },
            data,
            params,
        });
    }

    // --- session auth: cookie + authtoken + csrf, with auto-refresh ---
    let session = await ensureSession();

    for (let attempt = 0; attempt < 2; attempt++) {
        const options = {
            headers: {
                'Content-Type': contentTypeHeader,
                Accept: contentTypeHeader,
                cookie: session.cookie,
                authtoken: session.authtoken,
                'x-csrf-token': session.csrf,
            },
            data,
            params,
        };

        const response = await requestContext[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](url, options);

        const body = await response.text();
        if (!isAuthFailure(response, body) || attempt === 1) {
            return response;
        }

        session = await createSession();
    }

    throw new Error('[WmioSession] Unexpected retry flow');
}

/** Convenience wrapper — keeps existing callers unchanged */
export async function postWithSessionRefresh(
    requestContext: APIRequestContext,
    url: string,
    data?: unknown,
    params?: Record<string, string | number>,
): Promise<APIResponse> {
    return requestWithSessionRefresh('POST', requestContext, url, data, params);
}
