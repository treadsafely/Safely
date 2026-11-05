import type { FC } from 'react';

import type { FlameHistoryItem } from '@safely/core';
import { useFlameTransactionDetails } from '@safely/ux';

import { TransactionDetailsPanel } from './TransactionDetailsPanel';

export type FlameTransactionDetailsProps = {
    activity: FlameHistoryItem;
    onClose: () => void;
};

export const FlameTransactionDetails: FC<FlameTransactionDetailsProps> = props => {
    const { activity, onClose } = props;

    const details = useFlameTransactionDetails(activity);

    return (
        <TransactionDetailsPanel details={details} asset={activity.value.asset} onClose={onClose} />
    );
};
