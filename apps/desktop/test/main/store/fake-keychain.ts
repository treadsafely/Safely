import type { Keychain } from '../../../src/main/plugins/keychain';

export interface FakeKeychain extends Keychain {
    /** What the addon would have written, so a test can assert on the item rather than on a read. */
    put(service: string, account: string, value: Buffer): void;
    failWith(error: Error | null): void;
    reset(): void;
}

/** Stands in for securityd: the same shape and the same failures, in a Map. Never in `src/` — the
 *  development stub is inlined in `vite.main.config.ts`. */
export function createFakeKeychain(): FakeKeychain {
    const services = new Map<string, Map<string, Buffer>>();

    let failure: Error | null = null;

    const itemsOf = (service: string): Map<string, Buffer> => {
        const existing = services.get(service);

        if (existing) {
            return existing;
        }

        const created = new Map<string, Buffer>();

        services.set(service, created);

        return created;
    };

    const guard = <T>(result: T): Promise<T> =>
        failure ? Promise.reject(failure) : Promise.resolve(result);

    return {
        isAvailable: () => true,

        get: (service, account) => guard(itemsOf(service).get(account) ?? null),

        set: (service, account, value) =>
            guard(undefined).then(() => {
                itemsOf(service).set(account, Buffer.from(value, 'utf8'));
            }),

        remove: (service, account) =>
            guard(undefined).then(() => {
                itemsOf(service).delete(account);
            }),

        keys: service => guard([...itemsOf(service).keys()]),

        clear: service =>
            guard(undefined).then(() => {
                itemsOf(service).clear();
            }),

        put: (service, account, value) => {
            itemsOf(service).set(account, value);
        },

        failWith: error => {
            failure = error;
        },

        /* The store imports the keychain, so the instance is shared by every test in the file. */
        reset: () => {
            services.clear();
            failure = null;
        }
    };
}
