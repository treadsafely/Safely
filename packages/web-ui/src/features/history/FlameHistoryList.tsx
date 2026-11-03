import type { FC } from 'react';

import type { FlameHistoryItem } from '@safely/core';
import { FLAME_ASSET } from '@safely/core';
import { useFlameHistoryGroups, useFlameHistoryPolling } from '@safely/ux';

import { HistoryList } from './HistoryList';
import { useIsDocumentVisible } from '../../shared';

export type FlameHistoryListProps = {
    selectedActivityKey?: string;
    onSelectActivity: (activity: FlameHistoryItem) => void;
    onReceive: () => void;
    onNewActivity: () => void;
};

const activityKey = (activity: FlameHistoryItem): string => activity.txid;

export const FlameHistoryList: FC<FlameHistoryListProps> = props => {
    const { selectedActivityKey, onSelectActivity, onReceive, onNewActivity } = props;

    const { groups, fetchNextPage, hasNextPage, isFetchingNextPage } = useFlameHistoryGroups();

    useFlameHistoryPolling({ isEnabled: useIsDocumentVisible(), onNewActivity });

    return (
        <HistoryList
            groups={groups}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            assetSymbol={FLAME_ASSET.symbol}
            selectedActivityKey={selectedActivityKey}
            getActivityKey={activityKey}
            onSelectActivity={onSelectActivity}
            onReceive={onReceive}
        />
    );
};
