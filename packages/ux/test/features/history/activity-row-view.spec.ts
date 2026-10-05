import { describe, expect, it } from 'vitest';

import type {
    BtcAsset,
    BtcApiTx,
    CryptoAssetAmount as CryptoAssetAmountType,
    RampOrder
} from '@safely/core';
import {
    BLOCKCHAIN_NAME,
    BTC_ASSET,
    Contact,
    CryptoAssetAmount,
    GROUP_LABEL,
    NumberFormatter,
    WebNumberFormatLocale,
    ellipsisMiddle,
    vmTypeByBlockchainName
} from '@safely/core';
import { Logger } from '@safely/sync';

import type {
    ActivityItem,
    ActivityItemsDatedGroup,
    BtcActivityItem,
    OrderActivityItem
} from '../../../src/entities';
import type { ActivityRowContext } from '../../../src/features/history/activity-row-view';
import { buildHistoryGroupViews } from '../../../src/features/history/activity-row-view';
import type { DateFormatter } from '../../../src/shared/format/date';
import type { TranslateFn } from '../../../src/shared/i18n/types';

const TIMESTAMP = 1_700_000_000_000;
const COUNTERPARTY_ADDRESS = 'bc1qra0000000000000000000000000000m2e4c8';
const TIME_LABEL = '12:00';
const DAY_MONTH_LABEL = '12 Aug';

const t: TranslateFn = key => key;

const stubFormatter = (label: string): DateFormatter =>
    Object.assign(() => ({ format: () => label }), { format: () => label });

const numberFormatter = new NumberFormatter(new WebNumberFormatLocale('en-US'), new Logger());

const baseContext: ActivityRowContext = {
    t,
    groupFormatter: stubFormatter('group'),
    timeFormatter: stubFormatter(TIME_LABEL),
    dayMonthFormatter: stubFormatter(DAY_MONTH_LABEL),
    numberFormatter,
    portfolios: [],
    contacts: [],
    rate: undefined,
    showFullSentAmount: false
};

const btcAmount = (relativeAmount: number): CryptoAssetAmountType<BtcAsset> =>
    new CryptoAssetAmount({ relativeAmount, asset: BTC_ASSET });

const rawTx = (blockHeight: number): BtcApiTx => ({
    txid: 'txid',
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
}): BtcActivityItem => ({
    type: 'transaction',
    timestamp: TIMESTAMP,
    key: 'btc-1',
    transaction: {
        isInitiator: params.isInitiator,
        fromAddress: COUNTERPARTY_ADDRESS,
        toAddress: COUNTERPARTY_ADDRESS,
        value: btcAmount(0.03),
        fee: params.fee && { type: 'crypto', amount: params.fee },
        rate: null,
        raw: rawTx(params.blockHeight ?? 100)
    }
});

const orderActivity = (params: {
    type: RampOrder['type'];
    status: RampOrder['status'];
}): OrderActivityItem => ({
    type: 'order',
    timestamp: TIMESTAMP,
    key: 'order-1',
    order: {
        id: 'order-1',
        type: params.type,
        status: params.status,
        provider: 'guardarian',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
        fiatAmount: '100',
        fiatCurrency: 'USD',
        cryptoAmount: '0.001',
        blockchain: 'btc',
        token: 'btc',
        supportDetails: ''
    } as RampOrder,
    cryptoAmount: btcAmount(0.001)
});

const singleGroup = (
    activity: ActivityItem,
    meta: ActivityItemsDatedGroup['meta'] = { label: GROUP_LABEL.TODAY }
): ActivityItemsDatedGroup[] => [{ key: 'group-1', meta, items: [activity] }];

const buildRow = (activity: ActivityItem, context: Partial<ActivityRowContext> = {}) =>
    buildHistoryGroupViews(singleGroup(activity), { ...baseContext, ...context })[0].rows[0];

describe('buildHistoryGroupViews', () => {
    it('titles the group and keys rows by group and activity', () => {
        const groups = buildHistoryGroupViews(
            singleGroup(btcActivity({ isInitiator: true })),
            baseContext
        );

        expect(groups).toHaveLength(1);
        expect(groups[0].title).toBe('dateGroups.today');
        expect(groups[0].rows[0].key).toBe('group-1-btc-1');
        expect(groups[0].rows[0].activity.key).toBe('btc-1');
    });

    it('renders a confirmed outgoing transaction', () => {
        const row = buildRow(btcActivity({ isInitiator: true }));

        expect(row.title).toBe('history.transactionInfo.sent');
        expect(row.amountSign).toBe('−');
        expect(row.valueTone).toBe('primary');
        expect(row.isPending).toBe(false);
        expect(row.timestampLabel).toBe(TIME_LABEL);
        expect(row.formattedFiat).toBeNull();
    });

    it('renders a pending incoming transaction without a timestamp', () => {
        const row = buildRow(btcActivity({ isInitiator: false, blockHeight: -1 }));

        expect(row.title).toBe('history.transactionInfo.receiving');
        expect(row.amountSign).toBe('+');
        expect(row.valueTone).toBe('accentGreen');
        expect(row.isPending).toBe(true);
        expect(row.timestampLabel).toBeNull();
    });

    it('formats the timestamp with day and month outside the current month', () => {
        const groups = buildHistoryGroupViews(
            singleGroup(btcActivity({ isInitiator: true }), {
                label: GROUP_LABEL.THIS_YEAR,
                year: 2023,
                month: 7
            }),
            baseContext
        );

        expect(groups[0].rows[0].timestampLabel).toBe(DAY_MONTH_LABEL);
    });

    it('adds the fee to a sent amount when full precision is on', () => {
        const fee = btcAmount(0.00000073);
        const activity = btcActivity({ isInitiator: true, fee });

        const row = buildRow(activity, { showFullSentAmount: true });

        expect(row.formattedValue).toBe(
            btcAmount(0.03).add(fee).format(numberFormatter, { fullPrecision: true })
        );
    });

    it('prefers a contact over a bare address as the counterparty', () => {
        const contact = new Contact({
            addresses: [
                {
                    blockchain: vmTypeByBlockchainName(BLOCKCHAIN_NAME.BTC),
                    address: COUNTERPARTY_ADDRESS
                }
            ],
            meta: { name: 'Alice', color: '#ffffff' }
        });

        expect(
            buildRow(btcActivity({ isInitiator: true }), { contacts: [contact] }).counterparty
        ).toEqual({ kind: 'contact', meta: contact.meta });

        expect(buildRow(btcActivity({ isInitiator: true })).counterparty).toEqual({
            kind: 'address',
            label: ellipsisMiddle(COUNTERPARTY_ADDRESS, 6)
        });
    });

    it('renders an active purchase order as pending', () => {
        const row = buildRow(orderActivity({ type: 'onramp', status: 'pending' }));

        expect(row.title).toBe('history.orderInfo.purchase.default');
        expect(row.amountSign).toBe('+');
        expect(row.valueTone).toBe('accentGreen');
        expect(row.isPending).toBe(true);
        expect(row.timestampLabel).toBeNull();
        expect(row.counterparty).toEqual({ kind: 'provider', label: 'guardarian' });
    });

    it('drops the sign and dims the amount of a failed sale order', () => {
        const row = buildRow(orderActivity({ type: 'offramp', status: 'failed' }));

        expect(row.title).toBe('history.orderInfo.sale.failed');
        expect(row.amountSign).toBeNull();
        expect(row.valueTone).toBe('tertiary');
        expect(row.isPending).toBe(false);
    });

    it('names an expired order cancelled', () => {
        expect(buildRow(orderActivity({ type: 'onramp', status: 'expired' })).title).toBe(
            'history.orderInfo.purchase.cancelled'
        );
    });
});
