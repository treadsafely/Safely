import { app } from 'electron';
import path from 'node:path';

import { JsonStore } from './json-store';
import { createSecretBackend } from './secret-backend';
import type { SecretBackend, Store, StoreScope } from './types';

type Stores = { regular: Store; backend: SecretBackend };

let stores: Stores | null = null;

/** Created after the app is ready: the path depends on `userData`. */
export function createStores(): void {
    const directory = path.join(app.getPath('userData'), 'store');

    stores = {
        regular: new JsonStore(path.join(directory, 'regular.json')),
        backend: createSecretBackend(directory)
    };
}

function requireStores(): Stores {
    if (!stores) {
        throw new Error('Stores are not initialised yet');
    }

    return stores;
}

export function getStore(scope: StoreScope): Store {
    const current = requireStores();

    return scope === 'regular' ? current.regular : current.backend[scope];
}

export function getSecretBackend(): SecretBackend {
    return requireStores().backend;
}

/* No flush counterpart on purpose: every write is already on disk before it resolves. */
export async function clearStores(): Promise<void> {
    if (!stores) {
        return;
    }

    await Promise.all([stores.regular.clear(), stores.backend.erase()]);
}

export { KeychainError } from './keychain-error';
export type { SecretBackend, Store, StoreScope } from './types';
