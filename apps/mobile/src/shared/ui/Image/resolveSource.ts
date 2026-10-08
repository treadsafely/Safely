import type { ImageProps } from 'expo-image';

import BtcLogo from '@safely/ux/assets/images/btc-logo.svg';

const resourcesPattern = `/resources/images`;
const knownSources = {
    '/resources/images/btc-logo.svg': BtcLogo
};

export function resolveSource(source: ImageProps['source']): ImageProps['source'] | null {
    if (typeof source === 'string' && source.startsWith(resourcesPattern)) {
        return knownSources[source as keyof typeof knownSources] ?? source;
    }

    if (
        source &&
        typeof source === 'object' &&
        'uri' in source &&
        typeof source.uri === 'string' &&
        !isHttpsURL(source.uri)
    ) {
        return null;
    }

    return source;
}

function isHttpsURL(s: string): boolean {
    try {
        const url = new URL(s);
        return url.protocol === 'https:';
    } catch {
        return false;
    }
}
