import type { NumberFormatter } from '@safely/core';
import { SPACE } from '@safely/core';

import { buildTransactionDetailsSummary } from './transaction-details-view';
import type { BtcTransactionDetailsView, BtcTransactionStatusView } from './types';
import type { BtcActivityItem } from '../../entities';
import { isBtcTransactionPending } from '../../entities';
import type { DateFormatter, TranslateFn } from '../../shared';
import type { KnownCounterparties } from '../activity-display';
import type { AmountUnit } from '../amount-display';
import { resolveSentAmount } from '../amount-display';

export type BtcTransactionDetailsContext = KnownCounterparties & {
    t: TranslateFn;
    confirmedAtFormatter: DateFormatter;
    numberFormatter: NumberFormatter;
    showFullSentAmount: boolean;
    amountOrder: AmountUnit;
    status: BtcTransactionStatusView;
    explorerUrl: string;
};

export function buildBtcTransactionDetailsView(
    activity: BtcActivityItem,
    context: BtcTransactionDetailsContext
): BtcTransactionDetailsView {
    const { transaction } = activity;
    const { isInitiator, fee, rate } = transaction;
    const { numberFormatter } = context;

    const { amount, isFullPrecision } = resolveSentAmount({
        isInitiator,
        value: transaction.value,
        fee: fee?.amount,
        showFullSentAmount: context.showFullSentAmount
    });

    const formattedValue = amount.format(numberFormatter, { fullPrecision: isFullPrecision });
    const formattedFiat = rate
        ? amount.convert(rate).format(numberFormatter, { currencyDisplay: 'code' })
        : null;
    const isFiatFirst = context.amountOrder === 'fiat' && formattedFiat !== null;
    const counterpartyAddress = isInitiator ? transaction.toAddress : transaction.fromAddress;

    return {
        ...buildTransactionDetailsSummary(
            {
                isInitiator,
                isPending: isBtcTransactionPending(transaction.raw),
                timestamp: activity.timestamp,
                counterpartyAddress,
                txid: transaction.raw.txid
            },
            context
        ),
        counterpartyAddress,
        memo: null,
        assetImage: transaction.value.asset.image,
        amountSign: isInitiator ? '−' : '+',
        primaryAmount: isFiatFirst ? formattedFiat : formattedValue,
        secondaryAmount: isFiatFirst
            ? formattedValue
            : formattedFiat && `≈${SPACE.THSP}${formattedFiat}`,
        status: context.status,
        fee:
            rate && fee
                ? {
                      formattedFiat: fee.amount.convert(rate).format(numberFormatter),
                      formattedValue: fee.amount.format(numberFormatter)
                  }
                : null,
        explorerUrl: context.explorerUrl,
        hasFiatRateNote: rate !== null
    };
}
