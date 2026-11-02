import type { FC } from 'react';

import type { BtcHistoryItem } from '@safely/ux';

import { HistoryTable } from '../../../features';

export type HistoryProps = {
    selectedActivityKey?: string;
    onSelectActivity: (activity: BtcHistoryItem) => void;
    onReceive: () => void;
    onNewActivity: () => void;
};

export const History: FC<HistoryProps> = props => {
    const { selectedActivityKey, onSelectActivity, onReceive, onNewActivity } = props;

    return (
        <HistoryTable
            selectedActivityKey={selectedActivityKey}
            onSelectActivity={onSelectActivity}
            onReceive={onReceive}
            onNewActivity={onNewActivity}
        />
    );
};
