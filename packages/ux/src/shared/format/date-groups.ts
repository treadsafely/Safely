import type { DateGroupMeta, PendingGroupMeta } from '@safely/core';
import { GROUP_LABEL } from '@safely/core';

import type { DateFormatter } from './date';
import type { TranslateFn } from '../i18n/types';

export function getDateGroupTitle(
    meta: DateGroupMeta | PendingGroupMeta,
    t: TranslateFn,
    formatter: DateFormatter
): string {
    switch (meta.label) {
        case GROUP_LABEL.PENDING:
            return t('dateGroups.pending');
        case GROUP_LABEL.TODAY:
            return t('dateGroups.today');
        case GROUP_LABEL.YESTERDAY:
            return t('dateGroups.yesterday');
        case GROUP_LABEL.THIS_MONTH: {
            const date = new Date(meta.year, meta.month, meta.day);
            return formatter({ month: 'long', day: 'numeric' }).format(date);
        }
        case GROUP_LABEL.THIS_YEAR: {
            const date = new Date(meta.year, meta.month, 1);
            return formatter({ month: 'long' }).format(date);
        }
        case GROUP_LABEL.PAST_YEAR: {
            const date = new Date(meta.year, meta.month, 1);
            return formatter({ month: 'long', year: 'numeric' }).format(date);
        }
    }
}
