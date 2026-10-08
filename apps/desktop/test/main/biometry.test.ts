import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('../../src/main/logger', () => ({ mainLogger: { info } }));

const platform = process.platform;

function setPlatform(value: string): void {
    Object.defineProperty(process, 'platform', { value, configurable: true });
}

async function loadBiometry() {
    vi.resetModules();

    return import('../../src/main/biometry');
}

describe('main biometry', () => {
    beforeEach(() => {
        setPlatform('darwin');
        canPromptTouchID.mockReturnValue(true);
        promptTouchID.mockResolvedValue(undefined);
    });

    afterEach(() => {
        setPlatform(platform);
        vi.clearAllMocks();
    });

    it('is unavailable off macOS without asking Electron', async () => {
        setPlatform('win32');

        const { isBiometryAvailable } = await loadBiometry();

        expect(isBiometryAvailable()).toBe(false);
        expect(canPromptTouchID).not.toHaveBeenCalled();
    });

    it('reports what Electron reports on macOS', async () => {
        canPromptTouchID.mockReturnValue(false);

        const { isBiometryAvailable } = await loadBiometry();

        expect(isBiometryAvailable()).toBe(false);
    });

    it('resolves true on a satisfied prompt and passes the reason through', async () => {
        const { promptBiometry } = await loadBiometry();

        await expect(promptBiometry('unlock your wallet')).resolves.toBe(true);
        expect(promptTouchID).toHaveBeenCalledWith('unlock your wallet');
    });

    it('resolves false when the prompt is cancelled or fails', async () => {
        promptTouchID.mockRejectedValue(new Error('cancelled'));

        const { promptBiometry } = await loadBiometry();

        await expect(promptBiometry('unlock your wallet')).resolves.toBe(false);
        expect(info).toHaveBeenCalledOnce();
    });

    it('does not prompt when the factor is unavailable', async () => {
        canPromptTouchID.mockReturnValue(false);

        const { promptBiometry } = await loadBiometry();

        await expect(promptBiometry('unlock your wallet')).resolves.toBe(false);
        expect(promptTouchID).not.toHaveBeenCalled();
    });
});
