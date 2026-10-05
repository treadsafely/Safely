import { patch, projectIdentity, type DeepReadonly } from '@safely/slottree';

import { sDevicesMeta, type SDeviceMeta, type SDevicesMeta } from './schemas';
import { syncedStorageV5 } from '../v5/structure';

const syncedStorageSchema = syncedStorageV5.schema.extend({
    devicesMeta: sDevicesMeta
});

/* v5 still enumerates the platform, so a desktop device is shown to it as the closest known one */
const mapV6PlatformToV5Platform = (v6Platform: SDeviceMeta['platform']) => {
    switch (v6Platform) {
        case 'ios':
            return 'ios';
        case 'android':
            return 'android';
        default:
            return 'ios';
    }
};

function hasDevices(
    devicesMeta: DeepReadonly<SDevicesMeta>
): devicesMeta is DeepReadonly<NonNullable<SDevicesMeta>> {
    return devicesMeta !== null;
}

export const syncedStorageV6 = {
    version: 6,
    schema: syncedStorageSchema,
    initial: { ...syncedStorageV5.initial },
    projectUp: projectIdentity,
    projectDown: patch(syncedStorageSchema, syncedStorageV5.schema, draft =>
        draft.when(['devicesMeta'], hasDevices, present =>
            present.updateEach(['devicesMeta'], device =>
                device.update(['platform'], mapV6PlatformToV5Platform)
            )
        )
    )
} as const;
