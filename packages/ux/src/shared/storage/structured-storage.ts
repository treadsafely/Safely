import { useCallback } from 'react';
import type { z } from 'zod';

import type { ITreeStorage } from '@safely/sync';

export type StructuredStorageShape = Record<string, z.ZodType>;

export type StructuredStorage<S extends StructuredStorageShape> = {
    get<K extends keyof S & string>(key: K): Promise<z.output<S[K]>>;
    set<K extends keyof S & string>(key: K, value: z.input<S[K]>): Promise<void>;
    remove<K extends keyof S & string>(key: K): Promise<void>;
};

export function createStructuredStorage<S extends StructuredStorageShape>(
    node: ITreeStorage,
    shape: S
): StructuredStorage<S> {
    return {
        async get(key) {
            const stored = await node.getItem(key);
            const parsed: unknown = stored === null ? null : JSON.parse(stored);

            return shape[key].parse(parsed);
        },
        set(key, value) {
            shape[key].parse(value);

            return node.setItem(key, JSON.stringify(value));
        },
        remove(key) {
            return node.removeItem(key);
        }
    };
}

export type StructuredStorageKey<S extends StructuredStorageShape, K extends keyof S & string> = {
    get: () => Promise<z.output<S[K]>>;
    set: (value: z.input<S[K]>) => Promise<void>;
    remove: () => Promise<void>;
};

export function useStructuredStorage<S extends StructuredStorageShape, K extends keyof S & string>(
    storage: StructuredStorage<S>,
    key: K
): StructuredStorageKey<S, K> {
    const get = useCallback(() => storage.get(key), [storage, key]);

    const set = useCallback((value: z.input<S[K]>) => storage.set(key, value), [storage, key]);

    const remove = useCallback(() => storage.remove(key), [storage, key]);

    return { get, set, remove };
}
