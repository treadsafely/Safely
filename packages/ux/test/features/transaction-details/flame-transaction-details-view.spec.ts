import { describe, expect, it } from 'vitest';

import type { FlameHistoryItem } from '@safely/core';
import {
    FlameAssetAmount,
    NumberFormatter,
    WebNumberFormatLocale,
    ellipsisMiddle
} from '@safely/core';
import { Logger } from '@safely/sync';

import type { FlameTransactionDetailsContext } from '../../../src/features/transaction-details/flame-transaction-details-view';
import { buildFlameTransactionDetailsView } from '../../../src/features/transaction-details/flame-transaction-details-view';
import { buildFlameTransactionStatusView } from '../../../src/features/transaction-details/flame-transaction-status';
import type { DateFormatter } from '../../../src/shared/format/date';
import type { TranslateFn } from '../../../src/shared/i18n/types';

const TIMESTAMP = 1_700_000_000_000;
const TXID = 'f'.repeat(64);
const COUNTERPARTY_ADDRESS = 't1payer0000000000000000000000000000payer';
const DATE_LABEL = '21 Feb, 23:37';

const t: TranslateFn = (key, options) =>
    options === undefined ? key : `${key}:${JSON.stringify(options)}`;

const stubFormatter = (label: string): DateFormatter =>
    Object.assign(() => ({ format: () => label }), {
        format: () => label,
        formatWithNonCurrentYear: () => label
    });

const numberFormatter = new NumberFormatter(new WebNumberFormatLocale('en-US'), new Logger());

const status: FlameTransactionDetailsContext['status'] = {
    title: 'status.title',
    description: null,
    descriptionTone: 'secondary'
};

const baseContext: FlameTransactionDetailsContext = {
    t,
    contacts: [],
    portfolios: [],
    confirmedAtFormatter: stubFormatter(DATE_LABEL),
    numberFormatter,
    showFullSentAmount: false,
    status
};

const flameActivity = (params: Partial<FlameHistoryItem> = {}): FlameHistoryItem => ({
    txid: TXID,
    height: 12,
    timestamp: TIMESTAMP,
    isPending: false,
    isInitiator: false,
    value: FlameAssetAmount.fromWeiAmount(150_000_000n),
    fee: null,
    hasUnreadableOutputs: false,
    memo: null,
    counterpartyAddress: COUNTERPARTY_ADDRESS,
    ...params
});

const buildView = (
    activity: FlameHistoryItem,
    context: Partial<FlameTransactionDetailsContext> = {}
) => buildFlameTransactionDetailsView(activity, { ...baseContext, ...context });

describe('buildFlameTransactionDetailsView', () => {
    it('renders a confirmed receipt with its sender and memo', () => {
        expect(buildView(flameActivity({ memo: 'rent' }))).toEqual({
            title: 'history.transactionInfo.received',
            confirmedAtLabel: DATE_LABEL,
            isInitiator: false,
            amountSign: '+',
            primaryAmount: flameActivity().value.format(numberFormatter),
            secondaryAmount: null,
            counterpartyLabel: 'history.transactionInfo.sender',
            counterpartyAddress: COUNTERPARTY_ADDRESS,
            counterpartyName: ellipsisMiddle(COUNTERPARTY_ADDRESS, 6),
            memo: 'rent',
            status,
            fee: null,
            txid: TXID,
            txidLabel: ellipsisMiddle(TXID, 8),
            explorerUrl: null,
            hasFiatRateNote: false
        });
    });

    it('renders a pending send with its fee and an unknown recipient', () => {
        const fee = FlameAssetAmount.fromWeiAmount(10_000n);
        const view = buildView(
            flameActivity({
                isInitiator: true,
                isPending: true,
                height: null,
                fee,
                counterpartyAddress: null
            })
        );

        expect(view).toMatchObject({
            title: 'history.transactionInfo.sending',
            confirmedAtLabel: null,
            amountSign: '−',
            counterpartyLabel: 'history.transactionInfo.recipient',
            counterpartyAddress: null,
            counterpartyName: 'history.transactionInfo.unknown',
            fee: { formattedFiat: null, formattedValue: fee.format(numberFormatter) }
        });
    });

    it('adds the fee to a sent amount when full precision is on', () => {
        const fee = FlameAssetAmount.fromWeiAmount(10_000n);
        const activity = flameActivity({ isInitiator: true, fee });

        expect(buildView(activity, { showFullSentAmount: true }).primaryAmount).toBe(
            activity.value.add(fee).format(numberFormatter, { fullPrecision: true })
        );
    });

    it('drops the sign and shows a dash for an amount it could not read', () => {
        expect(buildView(flameActivity({ hasUnreadableOutputs: true }))).toMatchObject({
            amountSign: null,
            primaryAmount: '–'
        });
    });
});

describe('buildFlameTransactionStatusView', () => {
    const context = { t, statusFormatter: stubFormatter(DATE_LABEL) };

    it('has no block for a pending transaction', () => {
        expect(
            buildFlameTransactionStatusView(
                { isPending: true, height: null, timestamp: null },
                context
            )
        ).toEqual({
            title: 'history.transactionInfo.status.pending.title',
            description: null,
            descriptionTone: 'secondary'
        });
    });

    it('names the date and the block of a confirmed transaction', () => {
        expect(
            buildFlameTransactionStatusView(
                { isPending: false, height: 12, timestamp: TIMESTAMP },
                context
            )
        ).toEqual({
            title: `history.transactionInfo.status.confirmed.title:${JSON.stringify({ date: DATE_LABEL })}`,
            description: `history.transactionInfo.status.confirmed.block:${JSON.stringify({ height: 12 })}`,
            descriptionTone: 'secondary'
        });
    });

    it('omits the date when the node reports none', () => {
        expect(
            buildFlameTransactionStatusView(
                { isPending: false, height: 12, timestamp: null },
                context
            ).title
        ).toBe('history.transactionInfo.status.confirmed.titleUndated');
    });
});
