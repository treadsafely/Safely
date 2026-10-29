import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import type { Estimation } from '@safely/core';
import { BLOCKCHAIN_NAME, assertUnreachable } from '@safely/core';
import type { SendFormResult } from '@safely/ux';

import { TransactionCell } from '../TransactionCell';
import { BtcFeeWaitingTime } from '../TransactionFee';

export const ChainRecipientCells: FC<{ form: SendFormResult }> = ({ form }) => {
    const { t } = useTranslation();

    switch (form.blockchain) {
        case BLOCKCHAIN_NAME.BTC:
            return null;
        case BLOCKCHAIN_NAME.FLAME:
            return (
                !!form.memo && (
                    <TransactionCell
                        title={t('confirmation.memo')}
                        value={form.memo}
                        valueProps={{ numberOfLines: 4 }}
                    />
                )
            );
        default:
            return assertUnreachable(form);
    }
};

export const ChainFeeSubvalue: FC<{
    form: SendFormResult;
    estimation: Estimation | undefined;
}> = ({ form, estimation }) => {
    switch (form.blockchain) {
        case BLOCKCHAIN_NAME.BTC:
            return <BtcFeeWaitingTime estimation={estimation} />;
        case BLOCKCHAIN_NAME.FLAME:
            return null;
        default:
            return assertUnreachable(form);
    }
};
