import type { FC } from 'react';

import { assertUnreachable, BTC_ASSET } from '@safely/core';
import type { BtcHistoryItem } from '@safely/ux';
import { useBtcHistoryGroups, useBtcHistoryPolling } from '@safely/ux';

import { HistoryTable } from './HistoryTable';
import type { ActivityDirection } from '../../entities';
import { useIsDocumentVisible } from '../../shared';

export type BtcHistoryTableProps = {
    selectedActivityKey?: string;
    onSelectActivity: (activity: BtcHistoryItem) => void;
    onReceive: () => void;
    onNewActivity: () => void;
};

const activityKey = (activity: BtcHistoryItem): string => activity.key;

const activityTimestamp = (activity: BtcHistoryItem): number => activity.timestamp;

function activityDirection(activity: BtcHistoryItem): ActivityDirection {
    switch (activity.type) {
        case 'transaction':
            return activity.transaction.isInitiator ? 'out' : 'in';
        case 'order':
            return activity.order.type === 'offramp' ? 'out' : 'in';
        default:
            return assertUnreachable(activity as never);
    }
}

export const BtcHistoryTable: FC<BtcHistoryTableProps> = props => {
    const { selectedActivityKey, onSelectActivity, onReceive, onNewActivity } = props;

    const { groups, fetchNextPage, hasNextPage, isFetchingNextPage } = useBtcHistoryGroups();

    useBtcHistoryPolling({ isEnabled: useIsDocumentVisible(), onNewActivity });

    return (
        <HistoryTable
            groups={groups}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            assetSymbol={BTC_ASSET.symbol}
            selectedActivityKey={selectedActivityKey}
            getActivityKey={activityKey}
            getTimestamp={activityTimestamp}
            getDirection={activityDirection}
            onSelectActivity={onSelectActivity}
            onReceive={onReceive}
        />
    );
};
