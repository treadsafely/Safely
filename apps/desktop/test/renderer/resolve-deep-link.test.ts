import { describe, expect, it } from 'vitest';

import { resolveDeepLink } from '../../src/renderer/features/deep-link/resolve-deep-link';

const home = { view: { kind: 'home' }, modal: null };
const updates = { view: { kind: 'updates' }, modal: null };

describe('resolveDeepLink', () => {
    it.each([
        ['safely:///tab', home],
        ['safely://tab', home],
        ['safely:///tab/', home],
        ['safely:///tab/updates', updates],
        ['safely://tab/updates', updates],
        ['SAFELY://tab/updates?x=1#y', updates],
        ['https://link.safely.app/tab', home],
        ['https://link.safely.app/tab/updates', updates],
        ['https://link.safely.app/tab/updates/?utm=1#frag', updates]
    ])('%s opens %j', (url, location) => {
        expect(resolveDeepLink(url)).toEqual(location);
    });

    it.each([
        'safely://app/index.html',
        'safely:///',
        'safely:///import-flame-devnet-wallet#testseed=word',
        'safely:///tab/safety',
        'https://link.safely.app/',
        'https://link.safely.app/import-flame-devnet-wallet#testseed=word',
        'https://evil.example/tab/updates',
        'http://link.safely.app/tab/updates',
        'https://link.safely.app.evil.example/tab',
        'mailto:tab@updates',
        'not a url'
    ])('ignores %s', url => {
        expect(resolveDeepLink(url)).toBeNull();
    });
});
