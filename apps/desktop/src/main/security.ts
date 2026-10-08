import type {
    MediaAccessPermissionRequest,
    OnHeadersReceivedListenerDetails,
    WebContents
} from 'electron';
import { session } from 'electron';

/**
 * `style-src 'unsafe-inline'` is unavoidable: `@floating-ui` inside Base UI positions popups with
 * inline style attributes. `connect-src` is an allowlist — every endpoint the boot config hands
 * out lives under `safely.app` — so a new backend host fails loudly instead of widening it.
 */
const API_HOST_PATTERN = 'https://*.safely.app';

const BASE_POLICY = [
    "default-src 'none'",
    `img-src 'self' data: ${API_HOST_PATTERN}`,
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'"
];

const productionPolicy = (): string =>
    [...BASE_POLICY, "script-src 'self'", `connect-src 'self' ${API_HOST_PATTERN}`].join('; ');

/* Vite's dev server injects the react-refresh preamble inline and talks over a websocket. */
const developmentPolicy = (devServerUrl: string): string => {
    const { origin, host } = new URL(devServerUrl);

    return [
        ...BASE_POLICY,
        `script-src 'self' 'unsafe-inline' ${origin}`,
        `connect-src 'self' ${API_HOST_PATTERN} ${origin} ws://${host}`
    ].join('; ');
};

export function contentSecurityPolicy(devServerUrl: string | undefined): string {
    return devServerUrl ? developmentPolicy(devServerUrl) : productionPolicy();
}

/**
 * `Authorization` must be named explicitly: the `*` wildcard covers every header except that
 * one, and the sync API and its SSE stream both send it. Wildcards are legal here only because
 * no request carries credentials — do not introduce `credentials: 'include'` without revisiting.
 */
const ALLOWED_REQUEST_HEADERS = [
    'authorization',
    'content-type',
    'accept',
    'cache-control',
    'last-event-id',
    'x-requested-with'
].join(', ');

const isOwnApiUrl = (url: string): boolean => {
    try {
        const { protocol, hostname } = new URL(url);

        return (
            protocol === 'https:' && (hostname === 'safely.app' || hostname.endsWith('.safely.app'))
        );
    } catch {
        return false;
    }
};

function corsHeaders(details: OnHeadersReceivedListenerDetails): Record<string, string[]> {
    /* The backend's own `access-control-*` headers are dropped, not respected: the sync API
       answers with its own host as the origin, which no browser accepts. This whole block goes
       once the backends serve a correct policy. */
    const headers = Object.fromEntries(
        Object.entries(details.responseHeaders ?? {}).filter(
            ([name]) => !name.toLowerCase().startsWith('access-control-')
        )
    );

    headers['access-control-allow-origin'] = ['*'];
    headers['access-control-expose-headers'] = ['*'];

    if (details.method === 'OPTIONS') {
        headers['access-control-allow-methods'] = ['GET, POST, PUT, PATCH, DELETE, OPTIONS'];
        headers['access-control-allow-headers'] = [ALLOWED_REQUEST_HEADERS];
        headers['access-control-max-age'] = ['600'];
    }

    return headers;
}

export function hardenSession(devServerUrl: string | undefined): void {
    const policy = contentSecurityPolicy(devServerUrl);

    /* A session takes only one `onHeadersReceived` listener — a second registration silently
       replaces the first — so the CSP and the CORS relaxation share this one. */
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        if (isOwnApiUrl(details.url)) {
            /* A preflight answered with 404/405 fails the CORS check, so it is rewritten into a
               successful one. Electron routes preflights through webRequest since v9
               (electron/electron#22407). */
            const statusLine =
                details.method === 'OPTIONS' ? 'HTTP/1.1 200 OK' : details.statusLine;

            callback({ responseHeaders: corsHeaders(details), statusLine });
            return;
        }

        /* The packaged renderer gets its CSP from the `safely://` handler; this covers the dev server. */
        if (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame') {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [policy]
                }
            });
            return;
        }

        callback({});
    });

    /* The camera for the QR scanner is the only device granted, and only to the top frame. HID
       (Ledger) joins it as its own branch when that lands. Sanitized clipboard *writes* are the
       copy buttons; `clipboard-read` stays denied, so the renderer never sees what the user copied. */
    session.defaultSession.setPermissionRequestHandler(
        (_contents, permission, callback, details) => {
            if (permission === 'clipboard-sanitized-write') {
                callback(true);
                return;
            }

            callback(permission === 'media' && 'mediaTypes' in details && isCameraOnly(details));
        }
    );

    /* Chromium runs this check for `media` with no media type at all, and a `false` there also hides
       the device labels the source picker lists; capture stays gated by the request handler above. */
    session.defaultSession.setPermissionCheckHandler(
        (_contents, permission, _origin, details) =>
            permission === 'clipboard-sanitized-write' ||
            (permission === 'media' &&
                details.mediaType !== 'audio' &&
                details.mediaType !== 'unknown')
    );
}

const isCameraOnly = (details: MediaAccessPermissionRequest): boolean =>
    details.isMainFrame &&
    details.mediaTypes !== undefined &&
    details.mediaTypes.length > 0 &&
    details.mediaTypes.every(type => type === 'video');

const isAllowedOrigin = (url: string, allowedOrigins: string[]): boolean => {
    try {
        return allowedOrigins.includes(new URL(url).origin);
    } catch {
        return false;
    }
};

/** A wallet never opens a second renderer, a popup, a webview, or navigates off its own origin. */
export function hardenWebContents(contents: WebContents, allowedOrigins: string[]): void {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));

    contents.on('will-attach-webview', event => {
        event.preventDefault();
    });

    contents.on('will-navigate', (event, url) => {
        if (!isAllowedOrigin(url, allowedOrigins)) {
            event.preventDefault();
        }
    });
}
