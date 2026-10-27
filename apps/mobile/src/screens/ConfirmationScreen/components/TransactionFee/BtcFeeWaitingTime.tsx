import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import type { Estimation } from '@safely/core';
import { btcBlockWaitingTimeMinutes } from '@safely/core';

import { TransactionCell } from '../TransactionCell';

export const BtcFeeWaitingTime: FC<{ estimation: Estimation | undefined }> = ({ estimation }) => {
    const { t } = useTranslation();

    const targetBlock =
        estimation && 'txTargetBlock' in estimation
            ? Math.max(estimation.txTargetBlock, 1)
            : undefined;

    return (
        <TransactionCell.Subvalue skeletonVariant="transparentElement" skeletonWidth={40}>
            {targetBlock !== undefined
                ? t('confirmation.networkFee.timeMinutes', {
                      count: targetBlock * btcBlockWaitingTimeMinutes
                  })
                : undefined}
        </TransactionCell.Subvalue>
    );
};
