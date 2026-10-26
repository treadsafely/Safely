import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getMediaAccessStatus = vi.fn<(mediaType: string) => string>();
const askForMediaAccess = vi.fn<(mediaType: string) => Promise<boolean>>();
const openExternal = vi.fn<(url: string) => Promise<void>>();
const info = vi.fn();

vi.mock('electron', () => ({
    systemPreferences: {
        get getMediaAccessStatus() {
            return getMediaAccessStatus;
        },
        get askForMediaAccess() {
            return askForMediaAccess;
        }
    },
    shell: {
        get openExternal() {
            return openExternal;
        }
    }
}));

vi.mock('../../src/main/logger', () => ({ mainLogger: { info } }));

const platform = process.platform;

function setPlatform(value: string): void {
    Object.defineProperty(process, 'platform', { value, configurable: true });
}

async function loadCamera() {
    vi.resetModules();

    return import('../../src/main/camera');
}

describe('main camera', () => {
    beforeEach(() => {
        setPlatform('darwin');
        getMediaAccessStatus.mockReturnValue('granted');
        askForMediaAccess.mockResolvedValue(true);
        openExternal.mockResolvedValue(undefined);
    });

    afterEach(() => {
        setPlatform(platform);
        vi.clearAllMocks();
    });

    it('reports the status securityd knows', async () => {
        getMediaAccessStatus.mockReturnValue('denied');

        const { getCameraAccessStatus } = await loadCamera();

        expect(getCameraAccessStatus()).toBe('denied');
        expect(getMediaAccessStatus).toHaveBeenCalledWith('camera');
    });

    it('answers granted off macOS, where there is no such gate to ask', async () => {
        setPlatform('linux');

        const { getCameraAccessStatus, requestCameraAccess } = await loadCamera();

        expect(getCameraAccessStatus()).toBe('granted');
        await expect(requestCameraAccess()).resolves.toBe(true);
        expect(getMediaAccessStatus).not.toHaveBeenCalled();
        expect(askForMediaAccess).not.toHaveBeenCalled();
    });

    it('turns a refused prompt into a false rather than a rejection', async () => {
        askForMediaAccess.mockResolvedValue(false);

        const { requestCameraAccess } = await loadCamera();

        await expect(requestCameraAccess()).resolves.toBe(false);
    });

    it('survives a prompt that throws', async () => {
        askForMediaAccess.mockRejectedValue(new Error('no window'));

        const { requestCameraAccess } = await loadCamera();

        await expect(requestCameraAccess()).resolves.toBe(false);
        expect(info).toHaveBeenCalled();
    });

    it('opens the camera pane of the privacy settings', async () => {
        const { openCameraPrivacySettings } = await loadCamera();

        await openCameraPrivacySettings();

        expect(openExternal).toHaveBeenCalledWith(
            'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera'
        );
    });
});
