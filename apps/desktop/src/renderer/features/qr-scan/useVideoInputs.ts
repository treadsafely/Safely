import { useEffect, useState } from 'react';

import type { CameraOption } from '@safely/web-ui';

/* Labels stay empty until the camera permission is granted, and an iPhone appears and disappears
   through `devicechange` while the modal is open. */
export function useVideoInputs(isEnabled: boolean): readonly CameraOption[] {
    const [devices, setDevices] = useState<readonly CameraOption[]>([]);

    useEffect(() => {
        if (!isEnabled) {
            return;
        }

        let isCancelled = false;

        const refresh = async () => {
            const all = await navigator.mediaDevices.enumerateDevices();

            if (isCancelled) {
                return;
            }

            setDevices(
                all
                    .filter(device => device.kind === 'videoinput' && device.deviceId !== '')
                    .map(device => ({ deviceId: device.deviceId, label: device.label }))
            );
        };

        void refresh();
        navigator.mediaDevices.addEventListener('devicechange', refresh);

        return () => {
            isCancelled = true;
            navigator.mediaDevices.removeEventListener('devicechange', refresh);
        };
    }, [isEnabled]);

    return devices;
}
