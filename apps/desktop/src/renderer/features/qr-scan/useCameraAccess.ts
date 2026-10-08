import { useQuery } from '@tanstack/react-query';

import { qrScanKeys } from './keys';
import type { CameraAccessStatus } from '../../../shared/ipc';
import { platform } from '../../platform';

/* macOS asks once: after that only System Settings can change the answer, and a change there needs
   the app restarted, so the status is resolved once per scan and never refetched. */
export function useCameraAccess() {
    return useQuery<CameraAccessStatus>({
        queryKey: qrScanKeys.cameraAccess.toKey(),
        queryFn: async () => {
            const status = await platform.camera.getAccessStatus();

            if (status !== 'not-determined') {
                return status;
            }

            return (await platform.camera.requestAccess()) ? 'granted' : 'denied';
        },
        staleTime: Infinity
    });
}

export function openCameraSettings(): void {
    void platform.camera.openPrivacySettings();
}
