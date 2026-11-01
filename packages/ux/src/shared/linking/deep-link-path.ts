import { defineDeepLinkPaths } from './define-deep-link-paths';

export const DEEP_LINK_PATHS = defineDeepLinkPaths({
    tabs: { segment: 'tab', updates: 'updates' },
    importFlameDevnetWallet: 'import-flame-devnet-wallet'
});
