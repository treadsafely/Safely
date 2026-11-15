import type { UnlockOutcome } from '../../shared/ipc';

/** Main-side only: the IPC contract addresses a store by channel, not by a name on the wire. */
export type StoreScope = 'regular' | 'encrypted' | 'secureEncrypted';

export type SecretScope = Exclude<StoreScope, 'regular'>;

/** What a backing store owes the IPC handlers, whichever of the two it is. */
export interface Store {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(prefix: string): Promise<string[]>;
    removeWithPrefix(prefix: string): Promise<void>;
}

/* the platform's secret services as one object, chosen once at startup — see `secret-backend.ts` */
export interface SecretBackend {
    readonly encrypted: Store;
    readonly secureEncrypted: Store;
    unlock(windowHandle: Buffer | null): Promise<UnlockOutcome>;
    erase(): Promise<void>;
    isPresenceCheckAvailable(): Promise<boolean>;
    verifyPresence(windowHandle: Buffer | null, message: string): Promise<boolean>;
}
