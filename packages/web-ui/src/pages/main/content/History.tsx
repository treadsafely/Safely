import type { FC } from 'react';

import type { FlameHistoryItem } from '@safely/core';
import type { BtcHistoryItem, PortfolioWallets } from '@safely/ux';

import { BtcHistoryList, FlameHistoryList } from '../../../features';

export type HistoryProps = {
    wallets: PortfolioWallets;
    selectedActivityKey?: string;
    onSelectBtcActivity: (activity: BtcHistoryItem) => void;
    onSelectFlameActivity: (activity: FlameHistoryItem) => void;
    onReceive: () => void;
    onNewActivity: () => void;
};

export const History: FC<HistoryProps> = props => {
    const {
        wallets,
        selectedActivityKey,
        onSelectBtcActivity,
        onSelectFlameActivity,
        onReceive,
        onNewActivity
    } = props;

    if (wallets.flame !== null) {
        return (
            <FlameHistoryList
                selectedActivityKey={selectedActivityKey}
                onSelectActivity={onSelectFlameActivity}
                onReceive={onReceive}
                onNewActivity={onNewActivity}
            />
        );
    }

    return (
        <BtcHistoryList
            selectedActivityKey={selectedActivityKey}
            onSelectActivity={onSelectBtcActivity}
            onReceive={onReceive}
            onNewActivity={onNewActivity}
        />
    );
};
