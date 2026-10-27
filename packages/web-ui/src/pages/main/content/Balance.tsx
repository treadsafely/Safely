import type { FC } from 'react';

import {
    orderAmounts,
    useActivePortfolioWallets,
    useActiveWalletBtcBalance,
    useIsActivePortfolioWatchOnly,
    useNumberFormatter,
    usePortfolioBalanceUnit,
    useTotalBalance,
    useTranslate
} from '@safely/ux';

import { actionsStyles, amountsStyles, rowStyles } from './Balance.styles';
import { Button, Skeleton, Text } from '../../../shared';

const PRIMARY_SKELETON = { width: 152, height: 32 };
const SECONDARY_SKELETON = { width: 88, height: 20 };

export type BalanceProps = {
    onSend: () => void;
    onReceive: () => void;
    onScan: () => void;
};

export const Balance: FC<BalanceProps> = props => {
    const { onSend, onReceive, onScan } = props;

    const t = useTranslate();

    const { data: totalBalance } = useTotalBalance();
    const { data: btcBalance } = useActiveWalletBtcBalance();
    const isWatchOnly = useIsActivePortfolioWatchOnly();

    const formatter = useNumberFormatter();
    const mainBalanceUnit = usePortfolioBalanceUnit(useActivePortfolioWallets());

    const fiatAmount = totalBalance === null ? null : totalBalance?.format(formatter);
    const cryptoAmount = btcBalance?.display.format(formatter);

    const [primaryAmount, secondaryAmount] = orderAmounts(
        mainBalanceUnit,
        cryptoAmount,
        fiatAmount
    );

    return (
        <div className={rowStyles}>
            <div className={amountsStyles}>
                {primaryAmount === undefined ? (
                    <Skeleton {...PRIMARY_SKELETON} />
                ) : (
                    <Text variant="titleL">{primaryAmount}</Text>
                )}

                {secondaryAmount !== null &&
                    (secondaryAmount === undefined ? (
                        <Skeleton {...SECONDARY_SKELETON} />
                    ) : (
                        <Text variant="bodyL" tone="tertiary">
                            {secondaryAmount}
                        </Text>
                    ))}
            </div>

            <div className={actionsStyles}>
                <Button variant="secondary" size="small" disabled={isWatchOnly} onClick={onSend}>
                    {t('home.actions.send')}
                </Button>
                <Button variant="secondary" size="small" onClick={onReceive}>
                    {t('home.actions.receive')}
                </Button>
                <Button variant="secondary" size="small" disabled={isWatchOnly} onClick={onScan}>
                    {t('home.actions.scan')}
                </Button>
            </div>
        </div>
    );
};
