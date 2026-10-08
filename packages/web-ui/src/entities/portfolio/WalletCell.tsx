import type { FC } from 'react';

import type { Portfolio } from '@safely/core';
import { resolveBtcWallet, useBtcWalletFiatBalance, useNumberFormatter } from '@safely/ux';

import { PortfolioTypeBadge } from './PortfolioTypeBadge';
import { valueStyles } from './WalletCell.styles';
import { WalletIcon } from './WalletIcon';
import { Cell } from '../../shared';

export type WalletCellProps = {
    portfolio: Portfolio;
    isActive: boolean;
    onSelect: () => void;
};

export const WalletCell: FC<WalletCellProps> = props => {
    const { portfolio, isActive, onSelect } = props;

    const formatter = useNumberFormatter();
    const { data: balance } = useBtcWalletFiatBalance(resolveBtcWallet(portfolio));

    return (
        <Cell isSelected={isActive} onClick={onSelect}>
            <Cell.Leading>
                <WalletIcon icon={portfolio.meta.icon} />
            </Cell.Leading>
            <Cell.Content>
                <Cell.Row>
                    <Cell.Title>{portfolio.meta.name}</Cell.Title>
                    <PortfolioTypeBadge type={portfolio.type} />
                    <Cell.Value className={valueStyles}>{balance?.format(formatter)}</Cell.Value>
                </Cell.Row>
            </Cell.Content>
        </Cell>
    );
};
