import z from 'zod';

import { TreeStorage } from '@safely/core';
import { createStructuredStorage, useStructuredStorage } from '@safely/ux';

import { platform } from '../../../platform';

const desktopLayerEncryptedStorageShape = {
    passcode: z.union([z.null(), z.string()])
};

export const DESKTOP_LAYER_NODE = 'desktop';

export const desktopLayerEncryptedStorage = createStructuredStorage(
    TreeStorage.root(platform.storage.ENCRYPTED_DESKTOP_STORAGE_ONLY_APP_LEVEL_USE).child(
        DESKTOP_LAYER_NODE
    ),
    desktopLayerEncryptedStorageShape
);

export function useDesktopLayerEncryptedStorage<
    K extends keyof typeof desktopLayerEncryptedStorageShape
>(key: K) {
    return useStructuredStorage(desktopLayerEncryptedStorage, key);
}
