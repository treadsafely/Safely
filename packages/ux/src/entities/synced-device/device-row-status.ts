import type { SyncedDeviceDetails } from './types';
import { SyncedDeviceDataStatus } from './types';

export type SyncedDeviceStatusTone = 'secondary' | 'red' | 'orange';

export type SyncedDeviceRowStatus = {
    labelKey: string;
    tone: SyncedDeviceStatusTone;
};

export function resolveDeviceRowStatus(device: SyncedDeviceDetails): SyncedDeviceRowStatus {
    if (device.archive !== null) {
        return { labelKey: 'security.device.status.archived', tone: 'secondary' };
    }

    if (device.dataStatus === SyncedDeviceDataStatus.NOT_SYNCED) {
        return { labelKey: 'security.device.status.notSynced', tone: 'red' };
    }

    if (device.isStale && !device.isStaleWarningHidden) {
        return { labelKey: 'security.device.status.staleConnection', tone: 'red' };
    }

    if (device.dataStatus === SyncedDeviceDataStatus.UNKNOWN) {
        return { labelKey: 'security.device.status.unknown', tone: 'orange' };
    }

    return { labelKey: 'security.device.status.synced', tone: 'secondary' };
}
