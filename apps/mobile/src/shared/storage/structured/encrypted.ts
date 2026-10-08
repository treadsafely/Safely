import z from 'zod';

import { createStructuredStorage, useStructuredStorage } from '@safely/ux';

// eslint-disable-next-line boundaries/element-types
import { ENCRYPTED_MOBILE_STORAGE_ONLY_APP_LEVEL_USE } from '@mobile/app/storage';

const mobileLayerEncryptedStorageShape = {
    passcode: z.union([z.null(), z.string()])
};

const storage = createStructuredStorage(
    ENCRYPTED_MOBILE_STORAGE_ONLY_APP_LEVEL_USE.storage.child('mobile'),
    mobileLayerEncryptedStorageShape
);

export function useMobileLayerEncryptedStorage<
    K extends keyof typeof mobileLayerEncryptedStorageShape
>(key: K) {
    return useStructuredStorage(storage, key);
}
