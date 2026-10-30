import type { FlameHistoryItem, NumberFormatter } from '@safely/core';

import { buildTransactionDetailsSummary } from './transaction-details-view';
import type { FlameTransactionDetailsView, TransactionStatusView } from './types';
import type { DateFormatter, TranslateFn } from '../../shared';
import type { KnownCounterparties } from '../activity-display';
import { buildFlameActivityAmountView } from '../activity-display';

export type FlameTransactionDetailsContext = KnownCounterparties & {
    t: TranslateFn;
    confirmedAtFormatter: DateFormatter;
    numberFormatter: NumberFormatter;
    showFullSentAmount: boolean;
    status: TransactionStatusView;
    explorerUrl: string | null;
};

export function buildFlameTransactionDetailsView(
    activity: FlameHistoryItem,
    context: FlameTransactionDetailsContext
): FlameTransactionDetailsView {
    const { fee } = activity;
    const { amountSign, formattedValue } = buildFlameActivityAmountView(activity, context);

    return {
        ...buildTransactionDetailsSummary(activity, context),
        amountSign,
        primaryAmount: formattedValue,
        secondaryAmount: null,
        memo: activity.memo,
        status: context.status,
        fee: { formattedFiat: null, formattedValue: fee.format(context.numberFormatter) },
        explorerUrl: context.explorerUrl,
        hasFiatRateNote: false
    };
}
