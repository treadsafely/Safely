import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from '@safely/sync';

import { createFakeKeychain } from './fake-keychain';

const canPromptTouchID = vi.fn<() => boolean>();
const promptTouchID = vi.fn<(reason: string) => Promise<void>>();
const info = vi.fn();

vi.mock('electron', () => ({
    systemPreferences: {
        get canPromptTouchID() {
            return canPromptTouchID;
        },
        get promptTouchID() {
            return promptTouchID;
        }
    }
}));

const platform = process.platform;

function setPlatform(value: string): void {
    Object.defineProperty(process, 'platform', { value, configurable: true });
}

const SERVICES = { encrypted: 'test.encrypted', secureEncrypted: 'test.secureEncrypted' };

async function createBackend() {
    const { KeychainBackend } = await import('../../../src/main/store/keychain-backend');

    return new KeychainBackend(createFakeKeychain(), SERVICES, { info } as unknown as Logger);
}

describe('KeychainBackend', () => {
    beforeEach(() => {
        setPlatform('darwin');
        canPromptTouchID.mockReturnValue(true);
        promptTouchID.mockResolvedValue(undefined);
    });

    afterEach(() => {
        setPlatform(platform);
        vi.clearAllMocks();
    });

    it('is unlocked from the start, with no presence of its own', async () => {
        const backend = await createBackend();

        await expect(backend.unlock()).resolves.toEqual({
            state: 'unlocked',
            isPresenceVerified: false
        });
    });

    it('erases both scopes', async () => {
        const backend = await createBackend();

        await backend.encrypted.set('a', '1');
        await backend.secureEncrypted.set('b', '2');
        await backend.erase();

        expect(await backend.encrypted.get('a')).toBeNull();
        expect(await backend.secureEncrypted.get('b')).toBeNull();
    });

    it('has no presence check off macOS without asking Electron', async () => {
        setPlatform('linux');

        const backend = await createBackend();

        await expect(backend.isPresenceCheckAvailable()).resolves.toBe(false);
        expect(canPromptTouchID).not.toHaveBeenCalled();
    });

    it('reports what Electron reports on macOS', async () => {
        canPromptTouchID.mockReturnValue(false);

        const backend = await createBackend();

        await expect(backend.isPresenceCheckAvailable()).resolves.toBe(false);
    });

    it('resolves true on a satisfied prompt and passes the reason through', async () => {
        const backend = await createBackend();

        await expect(backend.verifyPresence(null, 'unlock your wallet')).resolves.toBe(true);
        expect(promptTouchID).toHaveBeenCalledWith('unlock your wallet');
    });

    it('resolves false when the prompt is cancelled or fails', async () => {
        promptTouchID.mockRejectedValue(new Error('cancelled'));

        const backend = await createBackend();

        await expect(backend.verifyPresence(null, 'unlock your wallet')).resolves.toBe(false);
        expect(info).toHaveBeenCalledOnce();
    });

    it('does not prompt when the factor is unavailable', async () => {
        canPromptTouchID.mockReturnValue(false);

        const backend = await createBackend();

        await expect(backend.verifyPresence(null, 'unlock your wallet')).resolves.toBe(false);
        expect(promptTouchID).not.toHaveBeenCalled();
    });
});
