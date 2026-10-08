import type { NumberFormatter } from '@safely/core';
import { SPACE, ellipsisMiddle } from '@safely/core';

import type { TransactionDetailsView, TransactionStatusView } from './types';
import type { BtcActivityItem } from '../../entities';
import { isBtcTransactionPending } from '../../entities';
import type { DateFormatter, TranslateFn } from '../../shared';
import type { AmountUnit } from '../amount-display';
import { resolveSentAmount } from '../amount-display';

export type TransactionDetailsContext = {
    t: TranslateFn;
    confirmedAtFormatter: DateFormatter;
    numberFormatter: NumberFormatter;
    showFullSentAmount: boolean;
    amountOrder: AmountUnit;
    status: TransactionStatusView;
    explorerUrl: string;
};

const ADDRESS_ELLIPSIS_CHARS = 6;
const TXID_ELLIPSIS_CHARS = 8;

export function buildTransactionDetailsView(
    activity: BtcActivityItem,
    context: TransactionDetailsContext
): TransactionDetailsView {
    const { transaction } = activity;
    const { isInitiator, fee, rate } = transaction;
    const { t, numberFormatter } = context;

    const isPending = isBtcTransactionPending(transaction.raw);

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
        title: isInitiator
            ? t(isPending ? 'history.transactionInfo.sending' : 'history.transactionInfo.sent')
            : t(
                  isPending
                      ? 'history.transactionInfo.receiving'
                      : 'history.transactionInfo.received'
              ),
        confirmedAtLabel: isPending
            ? null
            : context.confirmedAtFormatter.format(activity.timestamp),
        isInitiator,
        assetImage: transaction.value.asset.image,
        amountSign: isInitiator ? '−' : '+',
        primaryAmount: isFiatFirst ? formattedFiat : formattedValue,
        secondaryAmount: isFiatFirst
            ? formattedValue
            : formattedFiat && `≈${SPACE.THSP}${formattedFiat}`,
        counterpartyLabel: isInitiator
            ? t('history.transactionInfo.recipient')
            : t('history.transactionInfo.sender'),
        counterpartyAddress,
        counterpartyAddressLabel: ellipsisMiddle(counterpartyAddress, ADDRESS_ELLIPSIS_CHARS),
        status: context.status,
        fee:
            rate && fee
                ? {
                      formattedFiat: fee.amount.convert(rate).format(numberFormatter),
                      formattedValue: fee.amount.format(numberFormatter)
                  }
                : null,
        txid: transaction.raw.txid,
        txidLabel: ellipsisMiddle(transaction.raw.txid, TXID_ELLIPSIS_CHARS),
        explorerUrl: context.explorerUrl,
        hasFiatRateNote: rate !== null
    };
}
