import { createRequire } from 'node:module';
import path from 'node:path';

import type { Keychain } from './types';
import { mainLogger } from '../../logger';

let addon: Keychain | null = null;

try {
    /* `node_modules` never reaches the packaged app, so the addon travels as an extra resource and
       is loaded by path — see `forge.config.ts`. Anything else (another platform, an unbuilt
       checkout) fails the same way: there is no keychain. */
    addon = createRequire(__filename)(
        path.join(process.resourcesPath, 'keychain.node')
    ) as Keychain;
} catch {
    addon = null;
}

/* Checked at import, and the app is over if it fails: the store has no fallback, so a build that
   cannot reach the keychain must die before it serves anything rather than at the first secret.
   Exiting rather than throwing, because a throw this early reaches Electron's own handler, which
   raises a modal dialog and waits — measured, not feared. */
if (!addon?.isAvailable()) {
    mainLogger.error('The data protection keychain is unavailable — this build stores no secrets');
    process.exit(1);
}

/** The addon exports exactly `Keychain`, so this is the port with nothing in between. */
export const keychain: Keychain = addon;
