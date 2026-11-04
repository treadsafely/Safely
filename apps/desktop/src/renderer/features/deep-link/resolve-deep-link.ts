import { APP_URL_SCHEME, DEEP_LINK_PATHS, fragmentToQuery, UNIVERSAL_LINK_HOST } from '@safely/ux';
import type { MainLocation } from '@safely/web-ui';

export type ImportFlameDevnetLink = {
    kind: 'importFlameDevnetWallet';
    testseed: string;
    walletName: string | undefined;
};

export type DeepLinkTarget = { kind: 'location'; location: MainLocation } | ImportFlameDevnetLink;

/* `safely://tab/updates` equals `safely:///tab/updates`: the first segment is a path, not a host. */
const APP_LINK_PATH = new RegExp(`^${APP_URL_SCHEME}:/*([^?#]*)`, 'i');

/* The routes of the shared tree desktop has a screen for; any other path is ignored. */
const LOCATION_BY_PATH = new Map<string, MainLocation>([
    [DEEP_LINK_PATHS.tabs.path, { view: { kind: 'home' }, modal: null }],
    [DEEP_LINK_PATHS.tabs.updates.path, { view: { kind: 'updates' }, modal: null }]
]);

export function resolveDeepLink(url: string): DeepLinkTarget | null {
    const path = resolvePath(url);

    if (path === DEEP_LINK_PATHS.importFlameDevnetWallet.path) {
        return resolveImportFlameDevnetWallet(url);
    }

    const location = path === null ? undefined : LOCATION_BY_PATH.get(path);

    return location === undefined ? null : { kind: 'location', location };
}

function resolveImportFlameDevnetWallet(url: string): DeepLinkTarget | null {
    const params = new URLSearchParams(fragmentToQuery(url).split('?', 2)[1] ?? '');
    const testseed = params.get('testseed');

    if (testseed === null || testseed === '') {
        return null;
    }

    return {
        kind: 'importFlameDevnetWallet',
        testseed,
        walletName: params.get('walletName') ?? undefined
    };
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
