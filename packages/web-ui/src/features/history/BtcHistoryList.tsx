import type { FC } from 'react';

import { BTC_ASSET } from '@safely/core';
import type { BtcHistoryItem } from '@safely/ux';
import { useBtcHistoryGroups, useBtcHistoryPolling } from '@safely/ux';

import { HistoryList } from './HistoryList';
import { useIsDocumentVisible } from '../../shared';

export type BtcHistoryListProps = {
    selectedActivityKey?: string;
    onSelectActivity: (activity: BtcHistoryItem) => void;
    onReceive: () => void;
    onNewActivity: () => void;
};

const activityKey = (activity: BtcHistoryItem): string => activity.key;

export const BtcHistoryList: FC<BtcHistoryListProps> = props => {
    const { selectedActivityKey, onSelectActivity, onReceive, onNewActivity } = props;

    const { groups, fetchNextPage, hasNextPage, isFetchingNextPage } = useBtcHistoryGroups();

    useBtcHistoryPolling({ isEnabled: useIsDocumentVisible(), onNewActivity });

    return (
        <HistoryList
            groups={groups}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            assetSymbol={BTC_ASSET.symbol}
            selectedActivityKey={selectedActivityKey}
            getActivityKey={activityKey}
            onSelectActivity={onSelectActivity}
            onReceive={onReceive}
        />
    );
};
