import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { ITreeStorage } from '@safely/sync';

import { createStructuredStorage } from '../src/shared/storage';

const shape = {
    flag: z.union([z.null(), z.boolean()]),
    count: z.union([z.null(), z.number()])
};

function createNode() {
    const items = new Map<string, string>();

    const node = {
        getItem: vi.fn((key: string) => Promise.resolve(items.get(key) ?? null)),
        setItem: vi.fn((key: string, value: string) => {
            items.set(key, value);

            return Promise.resolve();
        }),
        removeItem: vi.fn((key: string) => {
            items.delete(key);

            return Promise.resolve();
        })
    } as unknown as ITreeStorage;

    return { node, items };
}

describe('createStructuredStorage', () => {
    it('round-trips a value through JSON', async () => {
        const { node, items } = createNode();
        const storage = createStructuredStorage(node, shape);

        await storage.set('count', 7);

        expect(items.get('count')).toBe('7');
        await expect(storage.get('count')).resolves.toBe(7);
    });

    it('reads a missing key as null', async () => {
        const { node } = createNode();
        const storage = createStructuredStorage(node, shape);

        await expect(storage.get('flag')).resolves.toBeNull();
    });

    it('rejects a stored value the shape does not accept', async () => {
        const { node, items } = createNode();
        const storage = createStructuredStorage(node, shape);

        items.set('flag', '"yes"');

        await expect(storage.get('flag')).rejects.toThrow();
    });

    it('refuses to write a value the shape does not accept, leaving the key untouched', () => {
        const { node, items } = createNode();
        const storage = createStructuredStorage(node, shape);

        expect(() => storage.set('flag', 'yes' as unknown as boolean)).toThrow();
        expect(items.has('flag')).toBe(false);
    });

    it('removes a key', async () => {
        const { node, items } = createNode();
        const storage = createStructuredStorage(node, shape);

        await storage.set('flag', true);
        await storage.remove('flag');

        expect(items.has('flag')).toBe(false);
    });
});
