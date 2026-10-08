import { describe, expect, it } from 'vitest';

import { resolveConnectionLabel } from '../../../src/entities/synced-device/connection-label';
import { resolveDeviceRowStatus } from '../../../src/entities/synced-device/device-row-status';
import type { SyncedDeviceDetails } from '../../../src/entities/synced-device/types';
import { SyncedDeviceDataStatus } from '../../../src/entities/synced-device/types';

const NOW = Date.UTC(2026, 5, 1);
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function device(overrides: Partial<SyncedDeviceDetails> = {}): SyncedDeviceDetails {
    return {
        ikPubHex: 'ab',
        meta: {
            name: 'Pixel 8',
            platform: 'android',
            osVersion: '15',
            appVersion: '1',
            pairedAt: 0
        },
        isCurrent: false,
        lastSyncAt: null,
        isStale: false,
        isStaleWarningHidden: false,
        dataStatus: SyncedDeviceDataStatus.SYNCED,
        pendingPortfolios: [],
        archive: null,
        ...overrides
    };
}

describe('resolveDeviceRowStatus', () => {
    it('reports an archived device before anything else', () => {
        const status = resolveDeviceRowStatus(
            device({
                dataStatus: SyncedDeviceDataStatus.NOT_SYNCED,
                isStale: true,
                archive: { archivedAt: NOW, isSignedOut: false, archivedFromDeviceName: 'iPhone' }
            })
        );

        expect(status).toEqual({ labelKey: 'security.device.status.archived', tone: 'secondary' });
    });

    it('reports pending data before a stale connection', () => {
        const status = resolveDeviceRowStatus(
            device({ dataStatus: SyncedDeviceDataStatus.NOT_SYNCED, isStale: true })
        );

        expect(status).toEqual({ labelKey: 'security.device.status.notSynced', tone: 'red' });
    });

    it('drops the stale warning once it is hidden', () => {
        const status = resolveDeviceRowStatus(
            device({ isStale: true, isStaleWarningHidden: true })
        );

        expect(status).toEqual({ labelKey: 'security.device.status.synced', tone: 'secondary' });
    });

    it('reports an unreported device as unknown', () => {
        const status = resolveDeviceRowStatus(
            device({ dataStatus: SyncedDeviceDataStatus.UNKNOWN })
        );

        expect(status).toEqual({ labelKey: 'security.device.status.unknown', tone: 'orange' });
    });
});

describe('resolveConnectionLabel', () => {
    it('answers without a count when the device never reported', () => {
        expect(resolveConnectionLabel(null, NOW)).toEqual({
            labelKey: 'security.deviceDetails.noConnectionYet',
            count: null,
            hasDate: false
        });
    });

    it('treats a future timestamp as now instead of a negative count', () => {
        expect(resolveConnectionLabel(NOW + HOUR, NOW)).toEqual({
            labelKey: 'security.deviceDetails.connectedNow',
            count: null,
            hasDate: false
        });
    });

    it('counts minutes, then hours', () => {
        expect(resolveConnectionLabel(NOW - 5 * MINUTE, NOW)).toEqual({
            labelKey: 'security.deviceDetails.minutesAgo',
            count: 5,
            hasDate: false
        });
        expect(resolveConnectionLabel(NOW - 3 * HOUR, NOW)).toEqual({
            labelKey: 'security.deviceDetails.hoursAgo',
            count: 3,
            hasDate: false
        });
    });

    it('names yesterday rather than counting one day', () => {
        expect(resolveConnectionLabel(NOW - DAY, NOW)).toEqual({
            labelKey: 'security.deviceDetails.yesterday',
            count: null,
            hasDate: false
        });
    });

    it('switches to weeks within a month', () => {
        expect(resolveConnectionLabel(NOW - 14 * DAY, NOW)).toEqual({
            labelKey: 'security.deviceDetails.weeksAgo',
            count: 2,
            hasDate: false
        });
    });

    it('adds the date once the relative label stops being useful', () => {
        expect(resolveConnectionLabel(NOW - 40 * DAY, NOW)).toEqual({
            labelKey: 'security.deviceDetails.daysAgo',
            count: 40,
            hasDate: true
        });
    });
});
