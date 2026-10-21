import { shell, systemPreferences } from 'electron';

import { mainLogger } from './logger';
import type { CameraAccessStatus } from '../shared/ipc';

/* Where the user has to go once the answer is `denied`: macOS asks once and then only remembers. */
const PRIVACY_CAMERA_PANE =
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera';

export function getCameraAccessStatus(): CameraAccessStatus {
    if (process.platform !== 'darwin') {
        return 'granted';
    }

    return systemPreferences.getMediaAccessStatus('camera');
}

export async function requestCameraAccess(): Promise<boolean> {
    if (process.platform !== 'darwin') {
        return true;
    }

    try {
        return await systemPreferences.askForMediaAccess('camera');
    } catch (error) {
        mainLogger.info('the camera access request failed', error);

        return false;
    }
}

/* Opened from a constant here rather than through the renderer's `openExternal` channel, which
   deliberately allows no such scheme. */
export async function openCameraPrivacySettings(): Promise<void> {
    await shell.openExternal(PRIVACY_CAMERA_PANE);
}
