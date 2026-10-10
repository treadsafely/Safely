import type { FC } from 'react';

import { useActiveWalletBtcBalance, useNumberFormatter, useTranslate } from '@safely/ux';
import InformationCircle12 from '@safely/ux/assets/icons/12/information-circle-12.svg?react';

import {
    pendingInfoStyles,
    pendingRowStyles,
    statusColumnStyles,
    statusStyles
} from './AmountStatus.styles';
import { Icon, Text } from '../../shared';

export type AmountStatusProps = {
    isMax: boolean;
    amountError: string | undefined;
    remainingBalance: string;
    onShowPending: () => void;
};

export const AmountStatus: FC<AmountStatusProps> = props => {
    const { isMax, amountError, remainingBalance, onShowPending } = props;

    const t = useTranslate();
    const formatter = useNumberFormatter();
    const { data: balance } = useActiveWalletBtcBalance();
    const pending = balance?.pending;
    const hasPending = pending?.relativeAmount.gt(0) ?? false;

    if (amountError !== undefined) {
        return (
            <Text variant="bodyM" tone="accentRed">
                {t(amountError)}
            </Text>
        );
    }

    if (isMax) {
        return (
            <Text variant="bodyM" tone="tertiary">
                {t('send.maxHint')}
            </Text>
        );
    }

    return (
        <div className={statusStyles}>
            <div className={statusColumnStyles}>
                <Text variant="bodyM" tone="tertiary">
                    {t('send.remaining')}
                </Text>
                {hasPending && (
                    <Text variant="bodyM" tone="tertiary">
                        {t('send.pending')}
                    </Text>
                )}
            </div>
            <div className={statusColumnStyles}>
                <Text variant="bodyM" tone="tertiary">
                    {remainingBalance}
                </Text>
                {hasPending && (
                    <button type="button" className={pendingRowStyles} onClick={onShowPending}>
                        <Text variant="bodyM" tone="tertiary">
                            {pending?.format(formatter)}
                        </Text>
                        <Icon
                            asset={InformationCircle12}
                            size={12}
                            tone="tertiary"
                            className={pendingInfoStyles}
                        />
                    </button>
                )}
            </div>
        </div>
    );
};
