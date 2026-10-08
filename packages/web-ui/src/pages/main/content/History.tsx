import type { FC } from 'react';

import type { ActivityItem } from '@safely/ux';

import { HistoryList } from '../../../features';

// TODO: point at the receive flow once it exists on the web targets
const notWired = () => undefined;

export type HistoryProps = {
    selectedActivityKey?: string;
    onSelectActivity: (activity: ActivityItem) => void;
};

export const History: FC<HistoryProps> = props => (
    <HistoryList
        selectedActivityKey={props.selectedActivityKey}
        onSelectActivity={props.onSelectActivity}
        onReceive={notWired}
    />
);
