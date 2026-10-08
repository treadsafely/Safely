/** Main-side only: the IPC contract addresses a store by channel, not by a name on the wire. */
export type StoreScope = 'regular' | 'encrypted' | 'secureEncrypted';

/** What a backing store owes the IPC handlers, whichever of the two it is. */
export interface Store {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(prefix: string): Promise<string[]>;
    removeWithPrefix(prefix: string): Promise<void>;
}
