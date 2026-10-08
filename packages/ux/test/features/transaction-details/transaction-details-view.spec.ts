import { describe, expect, it } from 'vitest';

import type {
    CryptoFiatRate,
    BtcApiTx,
    BtcAsset,
    CryptoAssetAmount as CryptoAssetAmountType
} from '@safely/core';
import {
    BTC_ASSET,
    CryptoAssetAmount,
    FiatAsset,
    FiatAssetId,
    NumberFormatter,
    Rate,
    SPACE,
    WebNumberFormatLocale,
    ellipsisMiddle,
    toBig
} from '@safely/core';
import { Logger } from '@safely/sync';

import type { BtcActivityItem, BtcTransactionDisplayStatus } from '../../../src/entities';
import { buildBtcTransactionStatusView } from '../../../src/features/transaction-details/btc-transaction-status';
import type { TransactionDetailsContext } from '../../../src/features/transaction-details/transaction-details-view';
import { buildTransactionDetailsView } from '../../../src/features/transaction-details/transaction-details-view';
import type { DateFormatter } from '../../../src/shared/format/date';
import type { TranslateFn } from '../../../src/shared/i18n/types';

const TIMESTAMP = 1_700_000_000_000;
const COUNTERPARTY_ADDRESS = 'bc1qra0000000000000000000000000000m2e4c8';
const TXID = 'db355a4f00000000000000000000000000000000000000000000000ok21cc23';
const CONFIRMED_AT_LABEL = '21 Feb, 23:37';
const STATUS_DATE_LABEL = '21 Feb, 23:37';
const EXPLORER_URL = `https://explorer.test/tx/${TXID}`;

const t: TranslateFn = (key, options) =>
    options === undefined ? key : `${key}:${JSON.stringify(options)}`;

const stubFormatter = (label: string): DateFormatter =>
    Object.assign(() => ({ format: () => label }), { format: () => label });

const numberFormatter = new NumberFormatter(new WebNumberFormatLocale('en-US'), new Logger());
const rate = new Rate(
    BTC_ASSET,
    new FiatAsset(new FiatAssetId('USD'), 'US Dollar'),
    toBig('50000')
);

const status: TransactionDetailsContext['status'] = {
    title: 'status.title',
    description: 'status.description',
    descriptionTone: 'secondary'
};

const baseContext: TransactionDetailsContext = {
    t,
    confirmedAtFormatter: stubFormatter(CONFIRMED_AT_LABEL),
    numberFormatter,
    showFullSentAmount: false,
    amountOrder: 'crypto',
    status,
    explorerUrl: EXPLORER_URL
};

const btcAmount = (relativeAmount: number): CryptoAssetAmountType<BtcAsset> =>
    new CryptoAssetAmount({ relativeAmount, asset: BTC_ASSET });

const rawTx = (blockHeight: number): BtcApiTx => ({
    txid: TXID,
    vin: [],
    vout: [],
    blockHeight,
    confirmations: blockHeight === -1 ? 0 : 3,
    blockTime: TIMESTAMP / 1000
});

const btcActivity = (params: {
    isInitiator: boolean;
    blockHeight?: number;
    fee?: CryptoAssetAmountType<BtcAsset>;
    rate?: CryptoFiatRate;
}): BtcActivityItem => ({
    type: 'transaction',
    timestamp: TIMESTAMP,
    key: 'btc-1',
    transaction: {
        isInitiator: params.isInitiator,
        fromAddress: COUNTERPARTY_ADDRESS,
        toAddress: COUNTERPARTY_ADDRESS,
        value: btcAmount(0.23),
        fee: params.fee && { type: 'crypto', amount: params.fee },
        rate: params.rate ?? null,
        raw: rawTx(params.blockHeight ?? 100)
    }
});

const buildView = (activity: BtcActivityItem, context: Partial<TransactionDetailsContext> = {}) =>
    buildTransactionDetailsView(activity, { ...baseContext, ...context });

describe('buildTransactionDetailsView', () => {
    it('renders a confirmed outgoing transaction', () => {
        const view = buildView(btcActivity({ isInitiator: true }));

        expect(view.title).toBe('history.transactionInfo.sent');
        expect(view.confirmedAtLabel).toBe(CONFIRMED_AT_LABEL);
        expect(view.amountSign).toBe('−');
        expect(view.counterpartyLabel).toBe('history.transactionInfo.recipient');
        expect(view.counterpartyAddress).toBe(COUNTERPARTY_ADDRESS);
        expect(view.counterpartyAddressLabel).toBe(ellipsisMiddle(COUNTERPARTY_ADDRESS, 6));
        expect(view.txid).toBe(TXID);
        expect(view.txidLabel).toBe(ellipsisMiddle(TXID, 8));
        expect(view.explorerUrl).toBe(EXPLORER_URL);
    });

    it('drops the date and names the direction as in flight while pending', () => {
        const view = buildView(btcActivity({ isInitiator: false, blockHeight: -1 }));

        expect(view.title).toBe('history.transactionInfo.receiving');
        expect(view.confirmedAtLabel).toBeNull();
        expect(view.amountSign).toBe('+');
        expect(view.counterpartyLabel).toBe('history.transactionInfo.sender');
    });

    it('keeps the crypto amount primary when there is no rate to convert with', () => {
        const view = buildView(btcActivity({ isInitiator: true }), { amountOrder: 'fiat' });

        expect(view.primaryAmount).toBe(btcAmount(0.23).format(numberFormatter));
        expect(view.secondaryAmount).toBeNull();
        expect(view.fee).toBeNull();
        expect(view.hasFiatRateNote).toBe(false);
    });

    it('leads with the fiat amount and demotes the crypto one', () => {
        const view = buildView(btcActivity({ isInitiator: true, rate }), { amountOrder: 'fiat' });

        expect(view.primaryAmount).toBe(
            btcAmount(0.23).convert(rate).format(numberFormatter, { currencyDisplay: 'code' })
        );
        expect(view.secondaryAmount).toBe(btcAmount(0.23).format(numberFormatter));
    });

    it('marks the crypto amount approximate when it is the secondary one', () => {
        const view = buildView(btcActivity({ isInitiator: true, rate }));

        expect(view.primaryAmount).toBe(btcAmount(0.23).format(numberFormatter));
        expect(view.secondaryAmount).toBe(
            `≈${SPACE.THSP}${btcAmount(0.23).convert(rate).format(numberFormatter, { currencyDisplay: 'code' })}`
        );
    });

    it('adds the fee to a sent amount and notes the historical rate', () => {
        const fee = btcAmount(0.0000077);
        const view = buildView(btcActivity({ isInitiator: true, fee, rate }), {
            amountOrder: 'fiat',
            showFullSentAmount: true
        });

        expect(view.primaryAmount).toBe(
            btcAmount(0.23)
                .add(fee)
                .convert(rate)
                .format(numberFormatter, { currencyDisplay: 'code' })
        );
        expect(view.fee).toEqual({
            formattedFiat: fee.convert(rate).format(numberFormatter),
            formattedValue: fee.format(numberFormatter)
        });
        expect(view.hasFiatRateNote).toBe(true);
    });
});

describe('buildBtcTransactionStatusView', () => {
    const context = { t, statusFormatter: stubFormatter(STATUS_DATE_LABEL) };

    it('describes a transaction still waiting for a block', () => {
        expect(buildBtcTransactionStatusView({ type: 'pending' }, context)).toEqual({
            title: 'history.transactionInfo.status.pending.title',
            description: 'history.transactionInfo.status.pending.description',
            descriptionTone: 'secondary'
        });
    });

    it('counts the confirmations of a recently mined transaction', () => {
        const recent: BtcTransactionDisplayStatus = {
            type: 'confirmed-recently',
            timestamp: new Date(TIMESTAMP),
            confirmations: 3
        };

        expect(buildBtcTransactionStatusView(recent, context)).toEqual({
            title: `history.transactionInfo.status.confirmed-recently.title:{"date":"${STATUS_DATE_LABEL}"}`,
            description:
                'history.transactionInfo.status.confirmed-recently.confirmations:{"count":3}',
            descriptionTone: 'accentGreen'
        });
    });

    it('stops counting once a transaction is settled', () => {
        const settled: BtcTransactionDisplayStatus = {
            type: 'confirmed-long-ago',
            timestamp: new Date(TIMESTAMP)
        };

        expect(buildBtcTransactionStatusView(settled, context).descriptionTone).toBe('secondary');
    });
});
