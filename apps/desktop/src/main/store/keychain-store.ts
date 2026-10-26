import type { Store } from './types';
import type { KeychainErrorCode } from '../../shared/ipc';
import { keychain } from '../plugins/keychain';

/**
 * The message is the code and nothing else: it crosses IPC into the renderer verbatim. Anything
 * diagnostic — an OSStatus, a key name — belongs on `cause`, which stays in main.
 */
export class KeychainError extends Error {
    constructor(
        public readonly code: KeychainErrorCode,
        options?: ErrorOptions
    ) {
        super(code, options);

        this.name = 'KeychainError';
    }
}

/* `fatal` on purpose: a value that is not the UTF-8 we wrote is a corrupt item, not a lossy one. */
const decoder = new TextDecoder('utf-8', { fatal: true });

/**
 * One keychain item per key, addressed by `service` + the key itself. There is no file, no data key
 * and no encryption of ours: what an item is worth is decided by the access group in our code
 * signature.
 */
export class KeychainStore implements Store {
    constructor(private readonly service: string) {}

    public async get(key: string): Promise<string | null> {
        const stored = await this.platform(() => keychain.get(this.service, key));

        if (stored === null) {
            return null;
        }

        try {
            return decoder.decode(stored);
        } catch (cause) {
            throw new KeychainError('CORRUPT', { cause });
        }
    }

    public async set(key: string, value: string): Promise<void> {
        await this.platform(() => keychain.set(this.service, key, value));
    }

    public async remove(key: string): Promise<void> {
        await this.platform(() => keychain.remove(this.service, key));
    }

    public async clear(): Promise<void> {
        await this.platform(() => keychain.clear(this.service));
    }

    public async keys(prefix: string): Promise<string[]> {
        const accounts = await this.platform(() => keychain.keys(this.service));

        return prefix === '' ? accounts : accounts.filter(account => account.startsWith(prefix));
    }

    public async removeWithPrefix(prefix: string): Promise<void> {
        /* the IEnumerableStorage contract: an empty prefix behaves as clear() */
        if (prefix === '') {
            return this.clear();
        }

        for (const account of await this.keys(prefix)) {
            await this.remove(account);
        }
    }

    /** Every platform failure is one fact — the store cannot be reached. Detail stays on `cause`. */
    private async platform<T>(operation: () => Promise<T>): Promise<T> {
        try {
            return await operation();
        } catch (cause) {
            throw new KeychainError('UNAVAILABLE', { cause });
        }
    }
}
