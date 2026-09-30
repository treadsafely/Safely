import type { FC } from 'react';

import {
    useActiveWalletBtcBalance,
    useIsActivePortfolioWatchOnly,
    useMainBalanceUnit,
    useNumberFormatter,
    useTotalBalance,
    useTranslate
} from '@safely/ux';

import { actionsStyles, amountsStyles, rowStyles } from './Balance.styles';
import { Button, Text } from '../../../shared';

export type BalanceProps = {
    onSend: () => void;
    onReceive: () => void;
};

export const Balance: FC<BalanceProps> = props => {
    const t = useTranslate();

    const { data: totalBalance } = useTotalBalance();
    const { data: btcBalance } = useActiveWalletBtcBalance();
    const isWatchOnly = useIsActivePortfolioWatchOnly();

    const formatter = useNumberFormatter();
    const mainBalanceUnit = useMainBalanceUnit();

    const fiatAmount = totalBalance?.format(formatter) ?? '—';
    const cryptoAmount = btcBalance?.display.format(formatter) ?? '—';

    const [primaryAmount, secondaryAmount] =
        mainBalanceUnit === 'crypto' ? [cryptoAmount, fiatAmount] : [fiatAmount, cryptoAmount];

    return (
        <div className={rowStyles}>
            <div className={amountsStyles}>
                <Text variant="titleL">{primaryAmount}</Text>
                <Text variant="bodyL" tone="tertiary">
                    {secondaryAmount}
                </Text>
            </div>

            <div className={actionsStyles}>
                <Button
                    variant="secondary"
                    size="small"
                    disabled={isWatchOnly}
                    onClick={props.onSend}
                >
                    {t('home.actions.send')}
                </Button>
                <Button variant="secondary" size="small" onClick={props.onReceive}>
                    {t('home.actions.receive')}
                </Button>
            </div>
        </div>
    );
};
