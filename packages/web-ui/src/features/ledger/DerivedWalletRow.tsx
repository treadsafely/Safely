import type { FC } from 'react';

import type { ILedgerDerivation } from '@safely/core';
import { ellipsisMiddle } from '@safely/core';
import {
    useActivePortfolioLedgerIndex,
    useBtcBalance,
    useFormattedAmount,
    useTranslate
} from '@safely/ux';
import Pencil16 from '@safely/ux/assets/icons/16/pencil-16.svg?react';

import { actionsStyles } from './DerivedWalletsList.styles';
import { LedgerDerivationRow } from './LedgerDerivationRow';
import { Badge, Button, Icon, Text } from '../../shared';

export type DerivedWalletRowProps = {
    derivation: ILedgerDerivation;
    onEdit: () => void;
    onHide: () => void;
};

export const DerivedWalletRow: FC<DerivedWalletRowProps> = props => {
    const { derivation, onEdit, onHide } = props;

    const t = useTranslate();
    const activeIndex = useActivePortfolioLedgerIndex();

    const wallet = derivation.chains.btc.wallets[0];
    const { data: balance } = useBtcBalance(wallet);
    const formattedBalance = useFormattedAmount(balance?.display);
    const isBalanceLoading = balance === undefined;

    return (
        <LedgerDerivationRow
            index={derivation.index}
            title={derivation.meta.name}
            subtitle={
                <>
                    <Text variant="bodyM" tone="secondary">
                        {formattedBalance}
                    </Text>
                    {` · ${ellipsisMiddle(wallet.address)}`}
                </>
            }
            badge={
                activeIndex === derivation.index ? (
                    <Badge isUppercase>{t('derivedWallets.active')}</Badge>
                ) : undefined
            }
            isSubtitleLoading={isBalanceLoading}
            accessory={
                <div className={actionsStyles}>
                    <Button variant="tertiary" size="xsmall" onClick={onHide}>
                        {t('derivedWallets.hide')}
                    </Button>
                    <Button
                        variant="tertiary"
                        size="xsmall"
                        isIconOnly
                        aria-label={t('settings.groups.currentWallet.options.editWallet')}
                        onClick={onEdit}
                    >
                        <Icon asset={Pencil16} />
                    </Button>
                </div>
            }
        />
    );
};
