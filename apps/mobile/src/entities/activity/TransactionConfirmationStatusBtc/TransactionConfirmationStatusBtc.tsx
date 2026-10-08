import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import type { BtcTransactionStatusSource } from '@safely/ux';
import { useBtcTransactionStatusView } from '@safely/ux';

import { TableCell } from '@mobile/shared/ui';

export const TransactionConfirmationStatusBtc: FC<{ tx: BtcTransactionStatusSource }> = ({
    tx
}) => {
    const { t } = useTranslation();
    const status = useBtcTransactionStatusView(tx);

    return (
        <>
            <TableCell.Column leading>
                <TableCell.Label>{t('history.transactionInfo.status.title')}</TableCell.Label>
            </TableCell.Column>
            <TableCell.Column>
                <TableCell.Value>{status.title}</TableCell.Value>
                <TableCell.Value color={status.descriptionTone}>
                    {status.description}
                </TableCell.Value>
            </TableCell.Column>
        </>
    );
};
