import { describe, expect, it } from 'vitest';

import { resolveDeepLink } from '../../src/renderer/features/deep-link/resolve-deep-link';

const home = { kind: 'location', location: { view: { kind: 'home' }, modal: null } };
const updates = { kind: 'location', location: { view: { kind: 'updates' }, modal: null } };
const importWallet = (testseed: string, walletName?: string) => ({
    kind: 'importFlameDevnetWallet',
    testseed,
    walletName
});

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
        ['https://link.safely.app/tab/updates/?utm=1#frag', updates],
        ['safely:///import-flame-devnet-wallet#testseed=a+b+c', importWallet('a b c')],
        ['safely://import-flame-devnet-wallet?testseed=a%20b', importWallet('a b')],
        [
            'https://link.safely.app/import-flame-devnet-wallet?walletName=Demo#testseed=w',
            importWallet('w', 'Demo')
        ],
        [
            'https://link.safely.app/import-flame-devnet-wallet/#testseed="a b"&walletName=X%20Y',
            importWallet('"a b"', 'X Y')
        ]
    ])('%s opens %j', (url, target) => {
        expect(resolveDeepLink(url)).toEqual(target);
    });

    it.each([
        'safely://app/index.html',
        'safely:///',
        'safely:///import-flame-devnet-wallet',
        'safely:///import-flame-devnet-wallet#testseed=',
        'https://link.safely.app/import-flame-devnet-wallet?walletName=Demo',
        'safely:///tab/safety',
        'https://link.safely.app/',
        'https://evil.example/tab/updates',
        'http://link.safely.app/tab/updates',
        'https://link.safely.app.evil.example/tab',
        'mailto:tab@updates',
        'not a url'
    ])('ignores %s', url => {
        expect(resolveDeepLink(url)).toBeNull();
    });
});
