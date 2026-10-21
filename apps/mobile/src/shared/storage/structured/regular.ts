import z from 'zod';

import { createStructuredStorage, sLockoutState, useStructuredStorage } from '@safely/ux';

// eslint-disable-next-line boundaries/element-types
import { REGULAR_MOBILE_STORAGE_ONLY_APP_LEVEL_USE } from '@mobile/app/storage';

const mobileLayerRegularStorageShape = {
    passcodeLockout: z.union([z.null(), sLockoutState]),
    biometryEnabled: z.union([z.null(), z.boolean()]),
    lockScreenEnabled: z.union([z.null(), z.boolean()])
};

const storage = createStructuredStorage(
    REGULAR_MOBILE_STORAGE_ONLY_APP_LEVEL_USE.storage.child('mobile'),
    mobileLayerRegularStorageShape
);

export function useMobileLayerRegularStorage<K extends keyof typeof mobileLayerRegularStorageShape>(
    key: K
) {
    return useStructuredStorage(storage, key);
}
