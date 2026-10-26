import type { Portfolio } from '@safely/core';
import type { SDeviceMeta } from '@safely/sync-storage';

export enum SyncedDeviceDataStatus {
    SYNCED = 'synced',
    NOT_SYNCED = 'not_synced',
    UNKNOWN = 'unknown'
}

export type SyncedDeviceArchive = {
    archivedAt: number;
    isSignedOut: boolean;
    archivedFromDeviceName: string | null;
};

export type SyncedDeviceDetails = {
    ikPubHex: string;
    meta: SDeviceMeta;
    isCurrent: boolean;
    lastSyncAt: number | null;
    isStale: boolean;
    isStaleWarningHidden: boolean;
    dataStatus: SyncedDeviceDataStatus;
    pendingPortfolios: readonly Portfolio[];
    archive: SyncedDeviceArchive | null;
};
