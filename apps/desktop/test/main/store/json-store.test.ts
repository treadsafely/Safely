import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
});
