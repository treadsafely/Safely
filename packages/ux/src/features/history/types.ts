import type { BtcHistoryItem } from '../../entities';
import type { ActivityCounterparty } from '../activity-display';

export type ActivityRowView<TActivity = BtcHistoryItem> = {
    key: string;
    activity: TActivity;
    title: string;
    amountSign: '+' | '−' | null;
    formattedValue: string;
    valueTone: 'primary' | 'accentGreen' | 'tertiary';
    formattedFiat: string | null;
    timestampLabel: string | null;
    isPending: boolean;
    counterparty: ActivityCounterparty;
    note?: string | null;
};

export type HistoryGroupView<TActivity = BtcHistoryItem> = {
    key: string;
    title: string;
    rows: ActivityRowView<TActivity>[];
};
