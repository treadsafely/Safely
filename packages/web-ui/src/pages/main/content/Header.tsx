import type { FC } from 'react';

import { ellipsisMiddle } from '@safely/core';
import { useActiveBtcWallet, useActivePortfolio, useTranslate } from '@safely/ux';

import { addressStyles, rowStyles, titleStyles } from './Header.styles';
import { PortfolioTypeBadge, WalletIcon } from '../../../entities';
import { Text, useCopyToClipboard } from '../../../shared';

export const Header: FC = () => {
    const t = useTranslate();
    const wallet = useActiveBtcWallet();
    const portfolio = useActivePortfolio();
    const { isCopied, copy } = useCopyToClipboard();

    return (
        <div className={rowStyles}>
            <div className={titleStyles}>
                <WalletIcon icon={portfolio.meta.icon} size="medium" />
                <Text variant="labelL">{portfolio.meta.name}</Text>
                <PortfolioTypeBadge type={portfolio.type} tone="warning" />
            </div>

            <Text
                variant="bodyM"
                tone={isCopied ? 'tertiary' : 'secondary'}
                className={addressStyles}
                onClick={() => copy(wallet.address)}
            >
                {isCopied
                    ? t('home.status.bitcoinAddressCopied')
                    : ellipsisMiddle(wallet.address, 6)}
            </Text>
        </div>
    );
};
