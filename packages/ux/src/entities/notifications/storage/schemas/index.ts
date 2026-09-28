import { sPushDeviceId } from './device-id.schema';
import { sPushGroupIds } from './group-ids.schema';
import { sPushSyncIds } from './sync-ids.schema';

export const pushSubscriptionStorageStructure = {
    deviceId: sPushDeviceId,
    groupIds: sPushGroupIds,
    syncIds: sPushSyncIds
} as const;

export type PushSubscriptionStorageStructure = typeof pushSubscriptionStorageStructure;
