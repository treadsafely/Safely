import type { ContactMeta, PortfolioMeta } from '@safely/core';

import type { ActivityItem } from '../../entities';

export type ActivityCounterparty =
    | { kind: 'contact'; meta: ContactMeta }
    | { kind: 'portfolio'; meta: PortfolioMeta }
    | { kind: 'address'; label: string }
    | { kind: 'provider'; label: string };

export type ActivityRowView = {
    key: string;
    activity: ActivityItem;
    title: string;
    amountSign: '+' | '−' | null;
    formattedValue: string;
    valueTone: 'primary' | 'accentGreen' | 'tertiary';
    formattedFiat: string | null;
    timestampLabel: string | null;
    isPending: boolean;
    counterparty: ActivityCounterparty;
};

export type HistoryGroupView = {
    key: string;
    title: string;
    rows: ActivityRowView[];
};
