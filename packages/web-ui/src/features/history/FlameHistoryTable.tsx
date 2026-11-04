import type { FC } from 'react';

import type { FlameHistoryItem } from '@safely/core';
import { FLAME_ASSET } from '@safely/core';
import { useFlameHistoryGroups, useFlameHistoryPolling } from '@safely/ux';

import { HistoryTable } from './HistoryTable';
import type { ActivityDirection } from '../../entities';
import { useIsDocumentVisible } from '../../shared';

export type FlameHistoryTableProps = {
    selectedActivityKey?: string;
    onSelectActivity: (activity: FlameHistoryItem) => void;
    onReceive: () => void;
    onNewActivity: () => void;
};

const activityKey = (activity: FlameHistoryItem): string => activity.txid;

const activityTimestamp = (activity: FlameHistoryItem): number | null => activity.timestamp;

const activityDirection = (activity: FlameHistoryItem): ActivityDirection =>
    activity.isInitiator ? 'out' : 'in';

export const FlameHistoryTable: FC<FlameHistoryTableProps> = props => {
    const { selectedActivityKey, onSelectActivity, onReceive, onNewActivity } = props;

    const { groups, fetchNextPage, hasNextPage, isFetchingNextPage } = useFlameHistoryGroups();

    useFlameHistoryPolling({ isEnabled: useIsDocumentVisible(), onNewActivity });

    return (
        <HistoryTable
            groups={groups}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            assetSymbol={FLAME_ASSET.symbol}
            selectedActivityKey={selectedActivityKey}
            getActivityKey={activityKey}
            getTimestamp={activityTimestamp}
            getDirection={activityDirection}
            onSelectActivity={onSelectActivity}
            onReceive={onReceive}
        />
    );
};
