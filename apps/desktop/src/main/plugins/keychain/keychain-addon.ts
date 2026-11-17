import { createRequire } from 'node:module';
import path from 'node:path';

import type { Keychain } from './types';
import { mainLogger } from '../../logger';

/* loaded by path from the resources — see `forge.config.ts`; exits rather than throws, a throw this early raises Electron's modal and waits */
export function loadKeychain(): Keychain {
    let addon: Keychain | null = null;

    try {
        addon = createRequire(__filename)(
            path.join(process.resourcesPath, 'keychain.node')
        ) as Keychain;
    } catch {
        addon = null;
    }

    if (!addon?.isAvailable()) {
        mainLogger.error(
            'The data protection keychain is unavailable — this build stores no secrets'
        );
        process.exit(1);
    }

    return addon;
}
