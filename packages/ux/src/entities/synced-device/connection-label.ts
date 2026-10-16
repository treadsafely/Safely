const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const DAYS_IN_WEEK = 7;
const MAX_RELATIVE_WEEKS = 4;

export type SyncedDeviceConnectionLabel = {
    labelKey: string;
    count: number | null;
    hasDate: boolean;
};

export function resolveConnectionLabel(
    lastSyncAt: number | null,
    now: number = Date.now()
): SyncedDeviceConnectionLabel {
    if (lastSyncAt === null) {
        return { labelKey: 'security.deviceDetails.noConnectionYet', count: null, hasDate: false };
    }

    const diffMs = Math.max(0, now - lastSyncAt);
    const days = Math.floor(diffMs / DAY_MS);
    const weeks = Math.floor(days / DAYS_IN_WEEK);

    if (diffMs < MINUTE_MS) {
        return { labelKey: 'security.deviceDetails.connectedNow', count: null, hasDate: false };
    }

    if (diffMs < HOUR_MS) {
        return {
            labelKey: 'security.deviceDetails.minutesAgo',
            count: Math.floor(diffMs / MINUTE_MS),
            hasDate: false
        };
    }

    if (diffMs < DAY_MS) {
        return {
            labelKey: 'security.deviceDetails.hoursAgo',
            count: Math.floor(diffMs / HOUR_MS),
            hasDate: false
        };
    }

    if (days === 1) {
        return { labelKey: 'security.deviceDetails.yesterday', count: null, hasDate: false };
    }

    if (days < DAYS_IN_WEEK) {
        return { labelKey: 'security.deviceDetails.daysAgo', count: days, hasDate: false };
    }

    if (weeks <= MAX_RELATIVE_WEEKS) {
        return { labelKey: 'security.deviceDetails.weeksAgo', count: weeks, hasDate: false };
    }

    return { labelKey: 'security.deviceDetails.daysAgo', count: days, hasDate: true };
}
