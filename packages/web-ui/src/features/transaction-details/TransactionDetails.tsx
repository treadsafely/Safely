import type { FC } from 'react';

import { BLOCKCHAIN_NAME } from '@safely/core';

import { BtcTransactionDetails } from './BtcTransactionDetails';
import { FlameTransactionDetails } from './FlameTransactionDetails';
import type { SelectedActivity } from './types';

export type TransactionDetailsProps = {
    selected: SelectedActivity;
    onClose: () => void;
};

export const TransactionDetails: FC<TransactionDetailsProps> = props => {
    const { selected, onClose } = props;

    switch (selected.blockchain) {
        case BLOCKCHAIN_NAME.BTC:
            return <BtcTransactionDetails activity={selected.activity} onClose={onClose} />;
        case BLOCKCHAIN_NAME.FLAME:
            return <FlameTransactionDetails activity={selected.activity} onClose={onClose} />;
    }
};
