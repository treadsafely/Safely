import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FakeKeychain } from './fake-keychain';
import { keychain } from '../../../src/main/plugins/keychain';
import { KeychainError, KeychainStore } from '../../../src/main/store/keychain-store';

/* The real module loads the addon at import and throws without one, so it is replaced whole. */
vi.mock('../../../src/main/plugins/keychain', async () => {
    const { createFakeKeychain } = await import('./fake-keychain');

    return { keychain: createFakeKeychain() };
});

const fake = keychain as FakeKeychain;

const SERVICE = 'test.encrypted';
const OTHER_SERVICE = 'test.secureEncrypted';

describe('KeychainStore', () => {
    const store = new KeychainStore(SERVICE);

    beforeEach(() => {
        fake.reset();
    });

    it('reads back what it wrote', async () => {
        await store.set('sync_key', 'a1b2');

        expect(await store.get('sync_key')).toBe('a1b2');
    });

    it('answers null for a key it has never seen', async () => {
        expect(await store.get('missing')).toBeNull();
    });

    it('replaces an existing value instead of adding a second item', async () => {
        await store.set('sync_key', 'first');
        await store.set('sync_key', 'second');

        expect(await store.keys('')).toEqual(['sync_key']);
        expect(await store.get('sync_key')).toBe('second');
    });

    it('removes a key, and removing an absent one is not an error', async () => {
        await store.set('sync_key', 'a1b2');
        await store.remove('sync_key');
        await store.remove('sync_key');

        expect(await store.get('sync_key')).toBeNull();
    });

    it('lists keys, filtered by prefix', async () => {
        await store.set('sync..devices..one', '1');
        await store.set('sync..devices..two', '2');
        await store.set('ux..locale', 'en');

        expect((await store.keys('')).sort()).toEqual([
            'sync..devices..one',
            'sync..devices..two',
            'ux..locale'
        ]);
        expect((await store.keys('sync..')).sort()).toEqual([
            'sync..devices..one',
            'sync..devices..two'
        ]);
    });

    it('removes by prefix and leaves the rest', async () => {
        await store.set('sync..one', '1');
        await store.set('ux..locale', 'en');

        await store.removeWithPrefix('sync..');

        expect(await store.keys('')).toEqual(['ux..locale']);
    });

    /* The IEnumerableStorage contract, and the one case where a loop would delete nothing. */
    it('treats an empty prefix as clear', async () => {
        await store.set('sync..one', '1');
        await store.set('ux..locale', 'en');

        await store.removeWithPrefix('');

        expect(await store.keys('')).toEqual([]);
    });

    /* The scopes will differ once the presence gate lands: one clearing the other would hand the
       ungated scope's lifetime to key material. */
    it('never touches another service', async () => {
        const other = new KeychainStore(OTHER_SERVICE);

        await store.set('shared_name', 'encrypted');
        await other.set('shared_name', 'secure');

        await store.clear();

        expect(await store.get('shared_name')).toBeNull();
        expect(await other.get('shared_name')).toBe('secure');
    });

    /* An item exists and does not hold what we wrote: never reported as absence, or the caller
       would treat a corrupt wallet as a fresh one. */
    it('reports a value that is not the UTF-8 it wrote as corrupt', async () => {
        fake.put(SERVICE, 'sync_key', Buffer.from([0xff, 0xfe]));

        await expect(store.get('sync_key')).rejects.toMatchObject({ code: 'CORRUPT' });
    });

    it('turns any platform failure into one fact, keeping the detail on cause', async () => {
        const cause = new Error('SecItemCopyMatching failed with OSStatus -34018');

        fake.failWith(cause);

        const error: unknown = await store.get('sync_key').catch((thrown: unknown) => thrown);

        expect(error).toBeInstanceOf(KeychainError);
        expect(error).toMatchObject({ code: 'UNAVAILABLE', cause });
    });

    it('keeps values byte-exact across the UTF-8 round trip', async () => {
        const value = JSON.stringify({ note: 'ключ — «мой», 🔑' });

        await store.set('note', value);

        expect(await store.get('note')).toBe(value);
    });
});
