import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { FileCodec } from '../../../src/main/store/json-store';
import { JsonStore } from '../../../src/main/store/json-store';

/* These read the file back instead of trusting the instance: the point is that what the store
   accepts is on disk before the call resolves. */
describe('JsonStore', () => {
    let directory: string;
    let filePath: string;

    const readFileAsRecord = async (): Promise<Record<string, string>> => {
        const raw = await fs.readFile(filePath, 'utf8');

        return JSON.parse(raw) as Record<string, string>;
    };

    beforeEach(async () => {
        directory = await fs.mkdtemp(path.join(os.tmpdir(), 'safely-store-'));
        filePath = path.join(directory, 'store.json');
    });

    afterEach(async () => {
        await fs.rm(directory, { recursive: true, force: true });
    });

    it('has written the value to disk by the time set() resolves', async () => {
        const store = new JsonStore(filePath);

        await store.set('answer', '42');

        expect(await readFileAsRecord()).toEqual({ answer: '42' });
    });

    it('leaves no temporary file behind', async () => {
        const store = new JsonStore(filePath);

        await store.set('answer', '42');

        expect(await fs.readdir(directory)).toEqual(['store.json']);
    });

    it('is readable by a fresh instance, so nothing depends on the in-memory copy', async () => {
        await new JsonStore(filePath).set('answer', '42');

        const reopened = new JsonStore(filePath);

        expect(await reopened.get('answer')).toBe('42');
    });

    it('keeps every concurrent write instead of losing all but the last', async () => {
        const store = new JsonStore(filePath);

        await Promise.all([store.set('a', '1'), store.set('b', '2'), store.set('c', '3')]);

        expect(await readFileAsRecord()).toEqual({ a: '1', b: '2', c: '3' });
    });

    it('persists removals', async () => {
        const store = new JsonStore(filePath);

        await store.set('a', '1');
        await store.set('b', '2');
        await store.remove('a');

        expect(await readFileAsRecord()).toEqual({ b: '2' });
    });

    it('treats an empty prefix as clear(), per the IEnumerableStorage contract', async () => {
        const store = new JsonStore(filePath);

        await store.set('sync.a', '1');
        await store.set('ux.b', '2');
        await store.removeWithPrefix('');

        expect(await readFileAsRecord()).toEqual({});
    });

    it('removes only the matching prefix', async () => {
        const store = new JsonStore(filePath);

        await store.set('sync.a', '1');
        await store.set('ux.b', '2');
        await store.removeWithPrefix('sync.');

        expect(await store.keys('')).toEqual(['ux.b']);
        expect(await readFileAsRecord()).toEqual({ 'ux.b': '2' });
    });

    it('reads an absent file as an empty store', async () => {
        const store = new JsonStore(filePath);

        expect(await store.get('missing')).toBeNull();
        expect(await store.keys('')).toEqual([]);
    });

    /* a store that cannot be read must say so: an empty answer here is how a write wipes the data */
    it('surfaces a read failure that is not an absent file', async () => {
        await fs.mkdir(filePath);

        const store = new JsonStore(filePath);

        await expect(store.get('answer')).rejects.toThrow();
    });

    it('erases the file and forgets its content', async () => {
        const store = new JsonStore(filePath);

        await store.set('answer', '42');
        await store.erase();

        expect(await fs.readdir(directory)).toEqual([]);
        expect(await store.get('answer')).toBeNull();
    });

    it('lets a write queued before erase land, and removes it with the rest', async () => {
        const store = new JsonStore(filePath);

        const write = store.set('answer', '42');

        await store.erase();
        await write;

        expect(await fs.readdir(directory)).toEqual([]);
        expect(await store.get('answer')).toBeNull();
    });

    it('hands the file content to its codec in both directions', async () => {
        const codec: FileCodec = {
            encode: data => [...data].map(([key, value]) => `${key}=${value}`).join('\n'),
            decode: content =>
                new Map(
                    content === ''
                        ? []
                        : content.split('\n').map(line => line.split('=') as [string, string])
                )
        };
        const store = new JsonStore(filePath, codec);

        await store.set('answer', '42');

        expect(await fs.readFile(filePath, 'utf8')).toBe('answer=42');
        expect(await new JsonStore(filePath, codec).get('answer')).toBe('42');
    });
});
