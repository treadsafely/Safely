import type { FC } from 'react';

import type { BtcActivityItem } from '@safely/ux';
import { useBtcTransactionDetails } from '@safely/ux';

import { TransactionDetailsPanel } from './TransactionDetailsPanel';

export type BtcTransactionDetailsProps = {
    activity: BtcActivityItem;
    onClose: () => void;
};

export const BtcTransactionDetails: FC<BtcTransactionDetailsProps> = props => {
    const { activity, onClose } = props;

    const details = useBtcTransactionDetails(activity);

    return (
        <TransactionDetailsPanel
            details={details}
            asset={activity.transaction.value.asset}
            onClose={onClose}
        />
    );
};
