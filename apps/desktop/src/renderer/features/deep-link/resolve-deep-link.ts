import { APP_URL_SCHEME, DEEP_LINK_PATHS, UNIVERSAL_LINK_HOST } from '@safely/ux';
import type { MainLocation } from '@safely/web-ui';

/* `safely://tab/updates` equals `safely:///tab/updates`: the first segment is a path, not a host. */
const APP_LINK_PATH = new RegExp(`^${APP_URL_SCHEME}:/*([^?#]*)`, 'i');

/* The routes of the shared tree desktop has a screen for; any other path is ignored. */
const LOCATION_BY_PATH = new Map<string, MainLocation>([
    [DEEP_LINK_PATHS.tabs.path, { view: { kind: 'home' }, modal: null }],
    [DEEP_LINK_PATHS.tabs.updates.path, { view: { kind: 'updates' }, modal: null }]
]);

export function resolveDeepLink(url: string): MainLocation | null {
    const path = resolvePath(url);

    return path === null ? null : (LOCATION_BY_PATH.get(path) ?? null);
}

function resolvePath(url: string): string | null {
    const appLink = APP_LINK_PATH.exec(url);

    if (appLink !== null) {
        return trimTrailingSlashes(`/${appLink[1] ?? ''}`);
    }

    return resolveUniversalLinkPath(url);
}

function resolveUniversalLinkPath(url: string): string | null {
    try {
        const { protocol, host, pathname } = new URL(url);

        return protocol === 'https:' && host === UNIVERSAL_LINK_HOST
            ? trimTrailingSlashes(pathname)
            : null;
    } catch {
        return null;
    }
}

const trimTrailingSlashes = (path: string): string => path.replace(/\/+$/, '');
