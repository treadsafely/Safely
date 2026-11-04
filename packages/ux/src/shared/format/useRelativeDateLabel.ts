import { useCallback } from 'react';

import { GROUP_LABEL, assertUnreachable, getEventGroupMeta } from '@safely/core';

import { useDateFormatter } from './date';
import { useTranslate } from '../i18n';

const TIME_FORMAT_OPTIONS = { hour: 'numeric', minute: 'numeric' } as const;
const DAY_MONTH_TIME_FORMAT_OPTIONS = {
    ...TIME_FORMAT_OPTIONS,
    day: 'numeric',
    month: 'short'
} as const;
const DAY_MONTH_YEAR_TIME_FORMAT_OPTIONS = {
    ...DAY_MONTH_TIME_FORMAT_OPTIONS,
    year: 'numeric'
} as const;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export function useRelativeDateLabel(): (timestamp: number) => string {
    const t = useTranslate();
    const timeFormatter = useDateFormatter(TIME_FORMAT_OPTIONS);
    const dayMonthTimeFormatter = useDateFormatter(DAY_MONTH_TIME_FORMAT_OPTIONS);
    const dayMonthYearTimeFormatter = useDateFormatter(DAY_MONTH_YEAR_TIME_FORMAT_OPTIONS);

    return useCallback(
        timestamp => {
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const { label } = getEventGroupMeta(timestamp, now, yesterday);

            switch (label) {
                case GROUP_LABEL.TODAY: {
                    const elapsed = now.getTime() - timestamp;
                    if (elapsed < MINUTE_MS) return t('relativeDate.justNow');
                    if (elapsed < HOUR_MS) {
                        return t('relativeDate.minutesAgo', {
                            count: Math.floor(elapsed / MINUTE_MS)
                        });
                    }
                    return t('relativeDate.hoursAgo', { count: Math.floor(elapsed / HOUR_MS) });
                }
                case GROUP_LABEL.YESTERDAY:
                    return t('relativeDate.yesterdayAt', { time: timeFormatter.format(timestamp) });
                case GROUP_LABEL.THIS_MONTH:
                case GROUP_LABEL.THIS_YEAR:
                    return dayMonthTimeFormatter.format(timestamp);
                case GROUP_LABEL.PAST_YEAR:
                    return dayMonthYearTimeFormatter.format(timestamp);
                default:
                    return assertUnreachable(label);
            }
        },
        [t, timeFormatter, dayMonthTimeFormatter, dayMonthYearTimeFormatter]
    );
}
