import z from 'zod';

import { TreeStorage } from '@safely/core';
import { createStructuredStorage, useStructuredStorage } from '@safely/ux';

import { DESKTOP_LAYER_NODE } from './node';
import { platform } from '../../../platform';

const desktopLayerRegularStorageShape = {
    lockScreenEnabled: z.union([z.null(), z.boolean()]),
    qrScanDeviceId: z.union([z.null(), z.string()])
};

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
