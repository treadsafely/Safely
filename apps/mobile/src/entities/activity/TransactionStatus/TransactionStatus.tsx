import { useTranslation } from 'react-i18next';

import type { TransactionStatusView } from '@safely/ux';

import { TableCell } from '@mobile/shared/ui';

export const TransactionStatus = ({ status }: { status: TransactionStatusView }) => {
    const { t } = useTranslation();

    return (
        <>
            <TableCell.Column leading>
                <TableCell.Label>{t('history.transactionInfo.status.title')}</TableCell.Label>
            </TableCell.Column>
            <TableCell.Column>
                <TableCell.Value>{status.title}</TableCell.Value>
                {status.description !== null && (
                    <TableCell.Value color={status.descriptionTone}>
                        {status.description}
                    </TableCell.Value>
                )}
            </TableCell.Column>
        </>
    );
};
