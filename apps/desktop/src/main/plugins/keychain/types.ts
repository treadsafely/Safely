/**
 * Shaped exactly like the addon that provides it. Every call reaches securityd, so all of them are
 * asynchronous; failures throw with whatever the platform said, and the store decides what that
 * means.
 */
export interface Keychain {
    isAvailable(): boolean;
    get(service: string, account: string): Promise<Buffer | null>;
    set(service: string, account: string, value: string): Promise<void>;
    remove(service: string, account: string): Promise<void>;
    keys(service: string): Promise<string[]>;
    clear(service: string): Promise<void>;
}
