import { net, protocol } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { contentSecurityPolicy } from './security';

/**
 * The packaged renderer is served from a privileged scheme instead of `file://`: a file page
 * gets an opaque origin, which makes IndexedDB/localStorage unreliable and weakens CSP.
 *
 * Same scheme as the deep links, but a different mechanism: this handler only serves requests
 * made *inside* the app's session, while `safely://` URLs coming from the OS arrive through
 * `open-url` / argv. A deep link therefore has a different host than `APP_ORIGIN` and is blocked
 * by the navigation guard — it must be turned into a route, never navigated to.
 */
export const APP_SCHEME = 'safely';

export const APP_ORIGIN = `${APP_SCHEME}://app`;

export const appUrl = (pathname: string): string => `${APP_ORIGIN}${pathname}`;

/** Must run before the app is ready, otherwise the privileges are ignored. */
export function registerPrivilegedSchemes(): void {
    protocol.registerSchemesAsPrivileged([
        {
            scheme: APP_SCHEME,
            privileges: {
                standard: true,
                secure: true,
                supportFetchAPI: true,
                allowServiceWorkers: false,
                corsEnabled: true
            }
        }
    ]);
}

export function registerAppProtocol(rendererDir: string): void {
    /* The CSP is attached here, not in the webRequest listener: responses from a custom
       protocol handler do not necessarily pass through it. */
    const policy = contentSecurityPolicy(undefined);

    protocol.handle(APP_SCHEME, async request => {
        const { pathname } = new URL(request.url);
        const requested = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
        const filePath = path.resolve(rendererDir, requested);

        /* the URL is reachable by anything the renderer fetches, so never serve outside the bundle */
        if (filePath !== rendererDir && !filePath.startsWith(rendererDir + path.sep)) {
            return new Response(null, { status: 403 });
        }

        const response = await net.fetch(pathToFileURL(filePath).toString());
        const headers = new Headers(response.headers);

        headers.set('Content-Security-Policy', policy);
        headers.set('X-Content-Type-Options', 'nosniff');

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers
        });
    });
}
