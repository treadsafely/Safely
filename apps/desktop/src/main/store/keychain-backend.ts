import { systemPreferences } from 'electron';

import type { Logger } from '@safely/sync';

import { KeychainStore } from './keychain-store';
import type { SecretBackend, SecretScope } from './types';
import type { UnlockOutcome } from '../../shared/ipc';
import type { Keychain } from '../plugins/keychain';

/* nothing to unlock: an item is readable whenever the code signature is ours, so the gate is the renderer's */
export class KeychainBackend implements SecretBackend {
    public readonly encrypted: KeychainStore;

    public readonly secureEncrypted: KeychainStore;

    constructor(
        keychain: Keychain,
        services: Record<SecretScope, string>,
        private readonly logger: Logger
    ) {
        this.encrypted = new KeychainStore(keychain, services.encrypted);
        this.secureEncrypted = new KeychainStore(keychain, services.secureEncrypted);
    }

    public unlock(): Promise<UnlockOutcome> {
        return Promise.resolve({ state: 'unlocked', isPresenceVerified: false });
    }

    public async erase(): Promise<void> {
        await Promise.all([this.encrypted.clear(), this.secureEncrypted.clear()]);
    }

    public isPresenceCheckAvailable(): Promise<boolean> {
        return Promise.resolve(
            process.platform === 'darwin' && systemPreferences.canPromptTouchID()
        );
    }

    /* a cancelled prompt and a broken sensor are one answer: the caller falls back to the passcode */
    public async verifyPresence(_windowHandle: Buffer | null, reason: string): Promise<boolean> {
        if (!(await this.isPresenceCheckAvailable())) {
            return false;
        }

        try {
            await systemPreferences.promptTouchID(reason);

            return true;
        } catch (error) {
            this.logger.info('Touch ID was not satisfied', error);

            return false;
        }
    }
}
