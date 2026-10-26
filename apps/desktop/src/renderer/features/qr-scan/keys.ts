import { defineQueryKeys, finalKey } from '@safely/ux';

export const qrScanKeys = defineQueryKeys('qrScan', {
    cameraAccess: finalKey,
    deviceId: finalKey
});
