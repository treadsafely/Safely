import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from '@safely/sync';

import type { FakeHello } from './fake-hello';
import { createFakeHello } from './fake-hello';
import { SealedBackend } from '../../../src/main/store/sealed-backend';
import { credentialNameOf } from '../../../src/main/store/sealed-key-session';

const HEADER_FILE = 'sealed-key.json';
const ENCRYPTED_FILE = 'sealed-encrypted.json';

const warn = vi.fn();
const logger = { warn, info: vi.fn(), error: vi.fn() } as unknown as Logger;

type Header = { version: number; installId: string; challenge: string; wrappedDataKey: string };

describe('SealedBackend', () => {
    let directory: string;
    let hello: FakeHello;
    let backend: SealedBackend;

    const readHeader = async (): Promise<Header> =>
        JSON.parse(await fs.readFile(path.join(directory, HEADER_FILE), 'utf8')) as Header;

    const writeHeader = (header: Header): Promise<void> =>
        fs.writeFile(path.join(directory, HEADER_FILE), JSON.stringify(header));

    const reopen = (): SealedBackend => new SealedBackend(hello, directory, logger);

    beforeEach(async () => {
        directory = await fs.mkdtemp(path.join(os.tmpdir(), 'safely-sealed-'));
        hello = createFakeHello();
        backend = reopen();
        vi.clearAllMocks();
    });

    afterEach(async () => {
        await fs.rm(directory, { recursive: true, force: true });
    });

    it('creates the credential and the header on the first unlock, after a prompt', async () => {
        await expect(backend.unlock(null)).resolves.toEqual({
            state: 'unlocked',
            isPresenceVerified: true
        });

        const header = await readHeader();

        expect(header.version).toBe(1);
        expect(hello.signCalls).toEqual([
            { credentialName: credentialNameOf(header.installId), mode: 'create' }
        ]);
    });

    it('opens the existing credential on the next launch and reads what was written', async () => {
        await backend.unlock(null);
        await backend.encrypted.set('sync/sync_key', 'a1b2');
        await backend.secureEncrypted.set('sync/master_key', 'c3d4');

        const next = reopen();

        await expect(next.unlock(null)).resolves.toEqual({
            state: 'unlocked',
            isPresenceVerified: true
        });
        expect(hello.signCalls.at(-1)?.mode).toBe('open');
        expect(await next.encrypted.get('sync/sync_key')).toBe('a1b2');
        expect(await next.secureEncrypted.get('sync/master_key')).toBe('c3d4');
    });

    it('answers unlocked without a prompt once the key is held', async () => {
        await backend.unlock(null);

        await expect(backend.unlock(null)).resolves.toEqual({
            state: 'unlocked',
            isPresenceVerified: false
        });
        expect(hello.signCalls).toHaveLength(1);
    });

    it('raises one prompt for concurrent unlock calls', async () => {
        const outcomes = await Promise.all([backend.unlock(null), backend.unlock(null)]);

        expect(outcomes.map(outcome => outcome.state)).toEqual(['unlocked', 'unlocked']);
        expect(hello.signCalls).toHaveLength(1);
    });

    it('refuses every store operation while locked and creates no header', async () => {
        await expect(backend.encrypted.get('sync/sync_key')).rejects.toMatchObject({
            code: 'UNAVAILABLE'
        });
        await expect(backend.encrypted.set('sync/sync_key', 'x')).rejects.toMatchObject({
            code: 'UNAVAILABLE'
        });
        await expect(backend.secureEncrypted.clear()).rejects.toMatchObject({
            code: 'UNAVAILABLE'
        });
        expect(await fs.readdir(directory)).toEqual([]);
    });

    it('writes nothing readable to disk', async () => {
        await backend.unlock(null);
        await backend.encrypted.set('sync/sync_key', 'a1b2c3d4');

        const content = await fs.readFile(path.join(directory, ENCRYPTED_FILE), 'utf8');

        expect(content).not.toContain('sync_key');
        expect(content).not.toContain('a1b2c3d4');
    });

    it('keeps the scopes apart', async () => {
        await backend.unlock(null);
        await backend.encrypted.set('shared', 'encrypted');
        await backend.secureEncrypted.set('shared', 'secure');
        await backend.encrypted.clear();

        expect(await backend.encrypted.get('shared')).toBeNull();
        expect(await backend.secureEncrypted.get('shared')).toBe('secure');
    });

    it('reports a scope file moved under the other scope as corrupt', async () => {
        await backend.unlock(null);
        await backend.encrypted.set('sync/sync_key', 'a1b2');

        await fs.copyFile(
            path.join(directory, ENCRYPTED_FILE),
            path.join(directory, 'sealed-secure-encrypted.json')
        );

        const next = reopen();

        await next.unlock(null);
        await expect(next.secureEncrypted.get('sync/sync_key')).rejects.toMatchObject({
            code: 'CORRUPT'
        });
    });

    it('reports a tampered scope file as corrupt, never as empty', async () => {
        await backend.unlock(null);
        await backend.encrypted.set('sync/sync_key', 'a1b2');

        const file = path.join(directory, ENCRYPTED_FILE);
        const blob = Buffer.from(await fs.readFile(file, 'utf8'), 'base64');

        blob[20] ^= 0x01;
        await fs.writeFile(file, blob.toString('base64'));

        const next = reopen();

        await next.unlock(null);
        await expect(next.encrypted.get('sync/sync_key')).rejects.toMatchObject({
            code: 'CORRUPT'
        });
    });

    it('answers mismatch when the credential signs differently', async () => {
        await backend.unlock(null);
        hello.rotateKey();

        await expect(reopen().unlock(null)).resolves.toEqual({ state: 'mismatch' });
        expect(warn).toHaveBeenCalledOnce();
    });

    it('answers mismatch when a header field was edited', async () => {
        await backend.unlock(null);

        const header = await readHeader();

        await writeHeader({ ...header, installId: 'f'.repeat(32) });
        hello.credentials.add(credentialNameOf('f'.repeat(32)));

        await expect(reopen().unlock(null)).resolves.toEqual({ state: 'mismatch' });
    });

    it('answers lost when the credential is gone but the header remains', async () => {
        await backend.unlock(null);
        hello.credentials.clear();

        await expect(reopen().unlock(null)).resolves.toEqual({ state: 'lost' });
    });

    it('answers lost when the header is missing while a scope file exists', async () => {
        await backend.unlock(null);
        await backend.encrypted.set('sync/sync_key', 'a1b2');
        await fs.rm(path.join(directory, HEADER_FILE));

        await expect(reopen().unlock(null)).resolves.toEqual({ state: 'lost' });
        expect(hello.signCalls).toHaveLength(1);
    });

    it('answers failed, not lost, when the header cannot be read for another reason', async () => {
        await fs.mkdir(path.join(directory, HEADER_FILE));

        await expect(backend.unlock(null)).resolves.toEqual({ state: 'failed' });
        expect(hello.signCalls).toHaveLength(0);
        expect(logger.error).toHaveBeenCalledOnce();
    });

    it('answers lost when the header cannot be parsed', async () => {
        await backend.unlock(null);
        await fs.writeFile(path.join(directory, HEADER_FILE), '{"version":');

        await expect(reopen().unlock(null)).resolves.toEqual({ state: 'lost' });
    });

    it('answers unsupported without a prompt when Windows Hello is not set up', async () => {
        hello.setSupported(false);

        await expect(backend.unlock(null)).resolves.toEqual({ state: 'unsupported' });
        expect(hello.signCalls).toHaveLength(0);
        expect(await fs.readdir(directory)).toEqual([]);
    });

    it.each(['unsupported', 'cancelled', 'failed'] as const)(
        'passes a %s answer from the prompt through, writes no header and keeps no credential',
        async answer => {
            hello.answerWith(answer);

            await expect(backend.unlock(null)).resolves.toEqual({ state: answer });
            expect(await fs.readdir(directory)).toEqual([]);
            expect(hello.credentials.size).toBe(0);
        }
    );

    it('unlocks on a retry after a cancelled prompt with one credential, not two', async () => {
        hello.answerWith('cancelled');
        await backend.unlock(null);
        hello.answerWith(null);

        await expect(backend.unlock(null)).resolves.toMatchObject({ state: 'unlocked' });
        expect([...hello.credentials]).toEqual([credentialNameOf((await readHeader()).installId)]);
    });

    it('refuses a header of an unknown version instead of starting over', async () => {
        await backend.unlock(null);

        const header = await readHeader();

        await writeHeader({ ...header, version: 2 });

        await expect(reopen().unlock(null)).resolves.toEqual({ state: 'lost' });
        expect(hello.signCalls).toHaveLength(1);
    });

    it('erases the files and the credential, and the next unlock starts over', async () => {
        await backend.unlock(null);
        await backend.encrypted.set('sync/sync_key', 'a1b2');

        const { installId } = await readHeader();

        await backend.erase();

        expect(await fs.readdir(directory)).toEqual([]);
        expect(hello.credentials.has(credentialNameOf(installId))).toBe(false);
        await expect(backend.encrypted.get('sync/sync_key')).rejects.toMatchObject({
            code: 'UNAVAILABLE'
        });

        await expect(backend.unlock(null)).resolves.toMatchObject({ state: 'unlocked' });
        expect((await readHeader()).installId).not.toBe(installId);
        expect(await backend.encrypted.get('sync/sync_key')).toBeNull();
    });

    it('fails a write queued before erase instead of recreating the scope file', async () => {
        await backend.unlock(null);

        const write = expect(backend.encrypted.set('sync/sync_key', 'a1b2')).rejects.toMatchObject({
            code: 'UNAVAILABLE'
        });

        await backend.erase();
        await write;

        expect(await fs.readdir(directory)).toEqual([]);
    });

    it('erases while locked, which is what the lost state needs', async () => {
        await backend.unlock(null);
        hello.credentials.clear();

        const locked = reopen();

        await expect(locked.unlock(null)).resolves.toEqual({ state: 'lost' });
        await locked.erase();

        expect(await fs.readdir(directory)).toEqual([]);
    });

    it('logs no key material when an unlock fails', async () => {
        await backend.unlock(null);
        hello.rotateKey();
        await reopen().unlock(null);

        const logged = JSON.stringify(warn.mock.calls);

        expect(logged).not.toMatch(/\[\d+(,\d+){8,}\]/);
        expect(logged).not.toMatch(/[0-9a-f]{32}/);
    });
});
