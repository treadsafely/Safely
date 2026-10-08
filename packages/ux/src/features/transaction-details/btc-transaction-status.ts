import { assertUnreachable } from '@safely/core';
import type { BtcApiTx } from '@safely/core';

import type { TransactionStatusView } from './types';
import type { BtcTransactionDisplayStatus } from '../../entities';
import { useBtcTransactionDisplayStatus } from '../../entities';
import type { DateFormatter, TranslateFn } from '../../shared';
import { useDateFormatter, useTranslate } from '../../shared';

export type BtcTransactionStatusSource = Pick<
    BtcApiTx,
    'blockHeight' | 'confirmations' | 'blockTime'
>;

export type BtcTransactionStatusContext = {
    t: TranslateFn;
    statusFormatter: DateFormatter;
};

const STATUS_DATE_FORMAT = {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
} as const;

export function buildBtcTransactionStatusView(
    status: BtcTransactionDisplayStatus,
    context: BtcTransactionStatusContext
): TransactionStatusView {
    const { t, statusFormatter } = context;

    switch (status.type) {
        case 'pending':
            return {
                title: t('history.transactionInfo.status.pending.title'),
                description: t('history.transactionInfo.status.pending.description'),
                descriptionTone: 'secondary'
            };
        case 'confirmed-recently':
            return {
                title: t('history.transactionInfo.status.confirmed-recently.title', {
                    date: statusFormatter.format(status.timestamp)
                }),
                description: t('history.transactionInfo.status.confirmed-recently.confirmations', {
                    count: status.confirmations
                }),
                descriptionTone: 'accentGreen'
            };
        case 'confirmed-long-ago':
            return {
                title: t('history.transactionInfo.status.confirmed-long-ago.title', {
                    date: statusFormatter.format(status.timestamp)
                }),
                description: t('history.transactionInfo.status.confirmed-long-ago.description'),
                descriptionTone: 'secondary'
            };
        default:
            return assertUnreachable(status);
    }
}

export function useBtcTransactionStatusView(tx: BtcTransactionStatusSource): TransactionStatusView {
    const t = useTranslate();
    const statusFormatter = useDateFormatter(STATUS_DATE_FORMAT);
    const status = useBtcTransactionDisplayStatus(tx);

    return buildBtcTransactionStatusView(status, { t, statusFormatter });
}
