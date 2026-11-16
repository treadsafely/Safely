import type { FC } from 'react';

import type { Recipient } from '@safely/core';
import { BLOCKCHAIN_NAME, ellipsisMiddle } from '@safely/core';
import {
    useActivePortfolio,
    useActivePortfolioLedgerIndex,
    useActivePortfolioWallets,
    useActiveWalletMeta,
    usePortfolioAssets,
    useTranslate
} from '@safely/ux';

import { addressStyles, rowStyles, titleStyles } from './Header.styles';
import { PortfolioTypeBadge, WalletIcon } from '../../../entities';
import { Badge, Text, useCopyToClipboard } from '../../../shared';

const COPIED_LABEL_KEY: Record<Recipient['blockchain'], string> = {
    [BLOCKCHAIN_NAME.BTC]: 'home.status.bitcoinAddressCopied',
    [BLOCKCHAIN_NAME.FLAME]: 'home.status.addressCopied'
};

export const Header: FC = () => {
    const t = useTranslate();
    const portfolio = useActivePortfolio();
    const walletMeta = useActiveWalletMeta();
    const ledgerIndex = useActivePortfolioLedgerIndex();
    const [primaryAsset] = usePortfolioAssets(useActivePortfolioWallets());
    const { isCopied, copy } = useCopyToClipboard();

    return (
        <div className={rowStyles}>
            <div className={titleStyles}>
                <WalletIcon icon={walletMeta.icon} size="medium" />
                <Text variant="labelL">{walletMeta.name}</Text>
                {ledgerIndex !== undefined && <Badge isUppercase>{ledgerIndex + 1}</Badge>}
                <PortfolioTypeBadge type={portfolio.type} tone="warning" />
            </div>

            {primaryAsset !== undefined && (
                <Text
                    variant="bodyM"
                    tone={isCopied ? 'tertiary' : 'secondary'}
                    className={addressStyles}
                    onClick={() => copy(primaryAsset.address)}
                >
                    {isCopied
                        ? t(COPIED_LABEL_KEY[primaryAsset.blockchain])
                        : ellipsisMiddle(primaryAsset.address, 6)}
                </Text>
            )}
        </div>
    );
};
