import { ellipsisMiddle } from '@safely/core';

import type { TransactionDetailsView } from './types';
import type { DateFormatter, TranslateFn } from '../../shared';
import type { KnownCounterparties } from '../activity-display';
import {
    counterpartyLabelOf,
    resolveActivityCounterparty,
    transactionTitleKey
} from '../activity-display';

export const CONFIRMED_AT_FORMAT = {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
} as const;

export const STATUS_DATE_FORMAT = {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
} as const;

const TXID_ELLIPSIS_CHARS = 8;

type TransactionDetailsSummary = Pick<
    TransactionDetailsView,
    | 'title'
    | 'confirmedAtLabel'
    | 'isInitiator'
    | 'counterpartyLabel'
    | 'counterpartyAddress'
    | 'counterpartyName'
    | 'txid'
    | 'txidLabel'
>;

export function buildTransactionDetailsSummary(
    transaction: {
        isInitiator: boolean;
        isPending: boolean;
        timestamp: number | null;
        counterpartyAddress: string | null;
        txid: string;
    },
    context: KnownCounterparties & { t: TranslateFn; confirmedAtFormatter: DateFormatter }
): TransactionDetailsSummary {
    const { isInitiator, isPending, timestamp, counterpartyAddress, txid } = transaction;
    const { t } = context;

    return {
        title: t(transactionTitleKey({ isInitiator, isPending })),
        confirmedAtLabel:
            isPending || timestamp === null
                ? null
                : context.confirmedAtFormatter.formatWithNonCurrentYear(timestamp),
        isInitiator,
        counterpartyLabel: isInitiator
            ? t('history.transactionInfo.recipient')
            : t('history.transactionInfo.sender'),
        counterpartyAddress,
        counterpartyName: counterpartyAddress
            ? counterpartyLabelOf(resolveActivityCounterparty(counterpartyAddress, context))
            : t('history.transactionInfo.unknown'),
        txid,
        txidLabel: ellipsisMiddle(txid, TXID_ELLIPSIS_CHARS)
    };
}
