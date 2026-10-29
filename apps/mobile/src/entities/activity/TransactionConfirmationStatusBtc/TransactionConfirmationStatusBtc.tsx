import type { FC } from 'react';

import type { BtcTransactionStatusSource } from '@safely/ux';
import { useBtcTransactionStatusView } from '@safely/ux';

import { TransactionStatus } from '../TransactionStatus';

export const TransactionConfirmationStatusBtc: FC<{ tx: BtcTransactionStatusSource }> = ({
    tx
}) => <TransactionStatus status={useBtcTransactionStatusView(tx)} />;
