import type { FC } from 'react';

import type { ActivityItem } from '@safely/ux';

import { HistoryList } from '../../../features';

export type HistoryProps = {
    selectedActivityKey?: string;
    onSelectActivity: (activity: ActivityItem) => void;
    onReceive: () => void;
    onNewActivity: () => void;
};

export const History: FC<HistoryProps> = props => {
    const { selectedActivityKey, onSelectActivity, onReceive, onNewActivity } = props;

    return (
        <HistoryList
            selectedActivityKey={selectedActivityKey}
            onSelectActivity={onSelectActivity}
            onReceive={onReceive}
            onNewActivity={onNewActivity}
        />
    );
};
