import z from 'zod';

import { TreeStorage } from '@safely/core';
import { createStructuredStorage, sLockoutState, useStructuredStorage } from '@safely/ux';

import { platform } from '../../../platform';

const desktopLayerRegularStorageShape = {
    passcodeLockout: z.union([z.null(), sLockoutState]),
    biometryEnabled: z.union([z.null(), z.boolean()]),
    lockScreenEnabled: z.union([z.null(), z.boolean()]),
    qrScanDeviceId: z.union([z.null(), z.string()])
};

export const DESKTOP_LAYER_NODE = 'desktop';

export const desktopLayerRegularStorage = createStructuredStorage(
    TreeStorage.root(platform.storage.REGULAR_DESKTOP_STORAGE_ONLY_APP_LEVEL_USE).child(
        DESKTOP_LAYER_NODE
    ),
    desktopLayerRegularStorageShape
);

export function useDesktopLayerRegularStorage<
    K extends keyof typeof desktopLayerRegularStorageShape
>(key: K) {
    return useStructuredStorage(desktopLayerRegularStorage, key);
}
