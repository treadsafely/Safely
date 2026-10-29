import type { FlameHistoryItem } from '@safely/core';

import type { TransactionStatusView } from './types';
import type { DateFormatter, TranslateFn } from '../../shared';

export type FlameTransactionStatusContext = {
    t: TranslateFn;
    statusFormatter: DateFormatter;
};

export function buildFlameTransactionStatusView(
    activity: Pick<FlameHistoryItem, 'isPending' | 'height' | 'timestamp'>,
    context: FlameTransactionStatusContext
): TransactionStatusView {
    const { t, statusFormatter } = context;

    if (activity.isPending || activity.height === null) {
        return {
            title: t('history.transactionInfo.status.pending.title'),
            description: null,
            descriptionTone: 'secondary'
        };
    }

    return {
        title:
            activity.timestamp === null
                ? t('history.transactionInfo.status.confirmed.titleUndated')
                : t('history.transactionInfo.status.confirmed.title', {
                      date: statusFormatter.format(activity.timestamp)
                  }),
        description: t('history.transactionInfo.status.confirmed.block', {
            height: activity.height
        }),
        descriptionTone: 'secondary'
    };
}
