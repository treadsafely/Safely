import { KeychainBackend } from './keychain-backend';
import { SealedBackend } from './sealed-backend';
import type { SecretBackend, SecretScope } from './types';
import { mainLogger } from '../logger';
import { loadHello } from '../plugins/hello';
import { loadKeychain } from '../plugins/keychain';

/* tied to the bundle id: changing a service or the bundle id abandons everything stored under it */
const KEYCHAIN_SERVICE: Record<SecretScope, string> = {
    encrypted: 'com.safely.wallet-desktop.encrypted',
    secureEncrypted: 'com.safely.wallet-desktop.secureEncrypted'
};

/* the one place the platform is chosen; `vite.main.config.ts` swaps this module for the dev stub */
export function createSecretBackend(directory: string): SecretBackend {
    switch (process.platform) {
        case 'win32':
            return new SealedBackend(loadHello(), directory, mainLogger);
        case 'darwin':
            return new KeychainBackend(loadKeychain(), KEYCHAIN_SERVICE, mainLogger);
        default:
            mainLogger.error(`No secret store for ${process.platform}`);
            process.exit(1);
    }
}
