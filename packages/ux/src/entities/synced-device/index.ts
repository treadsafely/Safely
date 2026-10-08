import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type { Portfolio } from '@safely/core';
import type { ISyncAccount } from '@safely/sync';
import type {
    SDeviceArchive,
    SDeviceMeta,
    SDeviceSyncState,
    SyncedStorageStructure
} from '@safely/sync-storage';

import { useHiddenDeviceWarningsQuery } from './hidden-warnings';
import type { SyncedDeviceDetails } from './types';
import { SyncedDeviceDataStatus } from './types';
import { isSensitivePortfolio } from './utils';
import { useAppContext } from '../../shared';
import type { SyncAccount } from '../account/account-state';
import { useActiveAccount, useActiveAccountStoreSlot } from '../account/account-state';
import { useAccountSyncStorageSlotUpdate } from '../account/useAccountSyncStorageUpdate';

export { useHideDeviceWarning } from './hidden-warnings';
export { useArchiveDevice, useUnarchiveDevice } from './device-archive';
export type { SyncedDeviceArchive, SyncedDeviceDetails } from './types';
export { SyncedDeviceDataStatus } from './types';
export type { SyncedDeviceRowStatus, SyncedDeviceStatusTone } from './device-row-status';
export { resolveDeviceRowStatus } from './device-row-status';
export type { SyncedDeviceConnectionLabel } from './connection-label';
export { resolveConnectionLabel } from './connection-label';

export function useSyncedDevicesMeta(): Record<string, SDeviceMeta> | null {
    return useActiveAccountStoreSlot('devicesMeta') ?? null;
}

export function useSyncedDeviceName(ikPubHex: string | null): string | null {
    const devicesMeta = useSyncedDevicesMeta();

    return ikPubHex === null ? null : (devicesMeta?.[ikPubHex]?.name ?? null);
}

export function useCurrentDeviceIkPub(): string {
    const account = useActiveAccount();

    return useMemo(() => account.getMyDeviceIkPub().toString('hex'), [account]);
}

const STALE_CONNECTION_MS = 30 * 24 * 60 * 60 * 1000;
const PAIRING_GRACE_MS = 60 * 1000;

function resolveDataStatus(params: {
    isCurrent: boolean;
    hasReported: boolean;
    isJustPaired: boolean;
    pendingPortfolios: readonly Portfolio[];
}): SyncedDeviceDataStatus {
    const { isCurrent, hasReported, isJustPaired, pendingPortfolios } = params;

    if (isCurrent) {
        return SyncedDeviceDataStatus.SYNCED;
    }

    if (!hasReported) {
        return isJustPaired ? SyncedDeviceDataStatus.SYNCED : SyncedDeviceDataStatus.UNKNOWN;
    }

    return pendingPortfolios.length === 0
        ? SyncedDeviceDataStatus.SYNCED
        : SyncedDeviceDataStatus.NOT_SYNCED;
}

function buildDeviceDetails(params: {
    ikPubHex: string;
    meta: SDeviceMeta;
    syncState: SDeviceSyncState | null;
    archive: SDeviceArchive | null;
    devicesMeta: Record<string, SDeviceMeta>;
    currentIkPubHex: string;
    portfolios: readonly Portfolio[];
    hiddenWarningUntil: number | undefined;
}): SyncedDeviceDetails {
    const {
        ikPubHex,
        meta,
        syncState,
        archive,
        devicesMeta,
        currentIkPubHex,
        portfolios,
        hiddenWarningUntil
    } = params;

    const isCurrent = ikPubHex === currentIkPubHex;
    const pendingPortfolios =
        syncState === null || isCurrent
            ? []
            : portfolios.filter(
                  p => isSensitivePortfolio(p) && !syncState.portfolioIds[p.id.toString()]
              );

    return {
        ikPubHex,
        meta,
        isCurrent,
        lastSyncAt: syncState?.lastSyncAt ?? null,
        isStale: syncState !== null && Date.now() - syncState.lastSyncAt > STALE_CONNECTION_MS,
        isStaleWarningHidden: hiddenWarningUntil !== undefined && hiddenWarningUntil > Date.now(),
        dataStatus: resolveDataStatus({
            isCurrent,
            hasReported: syncState !== null,
            isJustPaired: Date.now() - meta.pairedAt < PAIRING_GRACE_MS,
            pendingPortfolios
        }),
        pendingPortfolios,
        archive:
            archive === null
                ? null
                : {
                      archivedAt: archive.archivedAt,
                      isSignedOut: archive.archivedFromIkPubHex === null,
                      archivedFromDeviceName:
                          archive.archivedFromIkPubHex === null
                              ? null
                              : (devicesMeta[archive.archivedFromIkPubHex]?.name ?? null)
                  }
    };
}

export function useSyncedDeviceDetails(ikPubHex: string): SyncedDeviceDetails | null {
    const devicesMeta = useSyncedDevicesMeta();
    const devicesArchive = useActiveAccountStoreSlot('devicesArchive');
    const devicesSyncState = useActiveAccountStoreSlot('devicesSyncState');
    const portfolios = useActiveAccountStoreSlot('portfolios') ?? [];
    const currentIkPubHex = useCurrentDeviceIkPub();
    const { data: hiddenWarnings, isPending } = useHiddenDeviceWarningsQuery();
    const meta = devicesMeta?.[ikPubHex] ?? null;
    const syncState = devicesSyncState?.[ikPubHex] ?? null;
    const archive = devicesArchive?.[ikPubHex] ?? null;

    return useMemo(
        () =>
            meta === null
                ? null
                : buildDeviceDetails({
                      ikPubHex,
                      meta,
                      syncState,
                      archive,
                      devicesMeta: devicesMeta ?? {},
                      currentIkPubHex,
                      portfolios,
                      hiddenWarningUntil: isPending ? Infinity : hiddenWarnings?.[ikPubHex]
                  }),
        [
            ikPubHex,
            currentIkPubHex,
            meta,
            syncState,
            archive,
            devicesMeta,
            portfolios,
            hiddenWarnings,
            isPending
        ]
    );
}

export function useSyncedDevices(): SyncedDeviceDetails[] {
    const devicesMeta = useSyncedDevicesMeta();
    const devicesArchive = useActiveAccountStoreSlot('devicesArchive');
    const devicesSyncState = useActiveAccountStoreSlot('devicesSyncState');
    const portfolios = useActiveAccountStoreSlot('portfolios') ?? [];
    const currentIkPubHex = useCurrentDeviceIkPub();
    const { data: hiddenWarnings, isPending } = useHiddenDeviceWarningsQuery();

    return useMemo(
        () =>
            Object.entries(devicesMeta ?? {})
                .map(([ikPubHex, meta]) =>
                    buildDeviceDetails({
                        ikPubHex,
                        meta,
                        syncState: devicesSyncState?.[ikPubHex] ?? null,
                        archive: devicesArchive?.[ikPubHex] ?? null,
                        devicesMeta: devicesMeta ?? {},
                        currentIkPubHex,
                        portfolios,
                        hiddenWarningUntil: isPending ? Infinity : hiddenWarnings?.[ikPubHex]
                    })
                )
                .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent)),
        [
            devicesMeta,
            devicesSyncState,
            devicesArchive,
            currentIkPubHex,
            portfolios,
            hiddenWarnings,
            isPending
        ]
    );
}

export function useHasActivePeer(): boolean {
    const devices = useSyncedDevices();

    return devices.some(device => !device.isCurrent && device.archive === null);
}

export function useIsAttentionRequired(): boolean {
    const devices = useSyncedDevices();
    const hasActivePeer = useHasActivePeer();

    const hasPeers = devices.some(device => !device.isCurrent);

    return (
        (hasPeers && !hasActivePeer) ||
        devices.some(
            device =>
                device.archive === null &&
                ((device.isStale && !device.isStaleWarningHidden) ||
                    device.dataStatus !== SyncedDeviceDataStatus.SYNCED)
        )
    );
}

export enum AccountLinkState {
    SOLO = 'solo',
    PROTECTED = 'protected'
}

export function useAccountLinkState(): AccountLinkState {
    const selfIkPub = useCurrentDeviceIkPub();
    const devicesMeta = useSyncedDevicesMeta();

    const hasPeer = Object.keys(devicesMeta ?? {}).some(k => k !== selfIkPub);

    return hasPeer ? AccountLinkState.PROTECTED : AccountLinkState.SOLO;
}

export function useSetOwnSyncedDeviceMeta() {
    const update = useAccountSyncStorageSlotUpdate('devicesMeta');
    const generate = useGenerateOwnSyncedDeviceMeta();

    return useMutation<void, Error, ISyncAccount<SyncedStorageStructure>>({
        async mutationFn(syncAccount) {
            await update(syncAccount, draft => {
                const { key, value } = generate(syncAccount);
                draft.orDefault({}).entry(key).orDefault(value);
            });
        }
    });
}

export function useGenerateOwnSyncedDeviceMeta() {
    const { version, build, deviceInfo } = useAppContext();

    return useCallback(
        (account: SyncAccount) => {
            const ikPubHex = account.getMyDeviceIkPub().toString('hex');

            return {
                key: ikPubHex,
                value: {
                    name: deviceInfo.name,
                    platform: build,
                    osVersion: deviceInfo.osVersion,
                    appVersion: version,
                    pairedAt: Date.now()
                }
            };
        },
        [version, build, deviceInfo]
    );
}
