import type { FC } from 'react';
import { useMemo } from 'react';

import type { ILedgerDerivation, Portfolio, PortfolioLedger } from '@safely/core';
import { PortfolioType } from '@safely/core';
import {
    resolvePortfolioWallets,
    useBtcWalletFiatBalance,
    useNumberFormatter,
    usePortfolioTotalBalance
} from '@safely/ux';
import { cx } from '@safely/web-ui/styled-system/css';

import { PortfolioTypeBadge } from './PortfolioTypeBadge';
import {
    derivationCellStyles,
    derivationRowStyles,
    draggingDerivationStyles,
    draggingGroupStyles,
    groupRowStyles,
    groupStyles,
    groupTitleStyles,
    valueStyles
} from './WalletCell.styles';
import { WalletIcon } from './WalletIcon';
import type { CellSize } from '../../shared';
import { Badge, Cell, useReorderList } from '../../shared';

export type WalletCellProps = {
    portfolio: Portfolio;
    isActive: boolean;
    size?: CellSize;
    activeDerivationIndex?: number;
    onSelect: (derivationIndex?: number) => void;
    onReorderDerivations?: (portfolio: PortfolioLedger, orderedDerivationIds: string[]) => void;
};

export const WalletCell: FC<WalletCellProps> = props => {
    const { portfolio, isActive, size, activeDerivationIndex, onSelect, onReorderDerivations } =
        props;

    if (portfolio.type === PortfolioType.LEDGER) {
        return (
            <LedgerWalletCell
                portfolio={portfolio}
                size={size}
                activeDerivationIndex={isActive ? activeDerivationIndex : undefined}
                onSelect={onSelect}
                onReorder={onReorderDerivations}
            />
        );
    }

    return (
        <PlainWalletCell
            portfolio={portfolio}
            isActive={isActive}
            size={size}
            onSelect={() => onSelect()}
        />
    );
};

type PlainWalletCellProps = {
    portfolio: Portfolio;
    isActive: boolean;
    size?: CellSize;
    onSelect: () => void;
};

const PlainWalletCell: FC<PlainWalletCellProps> = props => {
    const { portfolio, isActive, size, onSelect } = props;

    const formatter = useNumberFormatter();
    const { data: balance } = usePortfolioTotalBalance(resolvePortfolioWallets(portfolio));

    return (
        <Cell size={size} isSelected={isActive} onClick={onSelect}>
            <Cell.Leading>
                <WalletIcon icon={portfolio.meta.icon} />
            </Cell.Leading>
            <Cell.Content>
                <Cell.Row>
                    <Cell.Title>{portfolio.meta.name}</Cell.Title>
                    <PortfolioTypeBadge type={portfolio.type} />
                    {balance !== null && (
                        <Cell.Value className={valueStyles}>
                            {balance?.format(formatter)}
                        </Cell.Value>
                    )}
                </Cell.Row>
            </Cell.Content>
        </Cell>
    );
};

type LedgerWalletCellProps = {
    portfolio: PortfolioLedger;
    size?: CellSize;
    activeDerivationIndex?: number;
    onSelect: (derivationIndex: number) => void;
    onReorder?: (portfolio: PortfolioLedger, orderedDerivationIds: string[]) => void;
};

const LedgerWalletCell: FC<LedgerWalletCellProps> = props => {
    const { portfolio, size, activeDerivationIndex, onSelect, onReorder } = props;

    const derivations = portfolio.getDerivations();
    const byId = useMemo(
        () => new Map(derivations.map(derivation => [derivation.id.toString(), derivation])),
        [derivations]
    );
    const {
        orderedIds,
        isDragging: isReordering,
        getItemProps
    } = useReorderList({
        ids: derivations.map(derivation => derivation.id.toString()),
        onReorder: orderedDerivationIds => onReorder?.(portfolio, orderedDerivationIds)
    });

    return (
        <div className={cx(groupStyles, isReordering && draggingGroupStyles)}>
            <Cell size={size}>
                <Cell.Leading>
                    <WalletIcon icon={portfolio.meta.icon} />
                </Cell.Leading>
                <Cell.Content>
                    <Cell.Row className={groupRowStyles}>
                        <Cell.Title className={groupTitleStyles}>{portfolio.meta.name}</Cell.Title>
                        <PortfolioTypeBadge type={portfolio.type} />
                    </Cell.Row>
                </Cell.Content>
            </Cell>

            {orderedIds.map(id => {
                const derivation = byId.get(id);

                if (derivation === undefined) {
                    return null;
                }

                const cell = (
                    <DerivationCell
                        derivation={derivation}
                        size={size}
                        isSelected={derivation.index === activeDerivationIndex}
                        onSelect={() => onSelect(derivation.index)}
                    />
                );

                if (onReorder === undefined) {
                    return <div key={id}>{cell}</div>;
                }

                const { isDragging, onPointerDown, ...itemProps } = getItemProps(id);

                return (
                    <div
                        key={id}
                        className={cx(derivationRowStyles, isDragging && draggingDerivationStyles)}
                        {...itemProps}
                        onPointerDown={event => {
                            event.stopPropagation();
                            onPointerDown(event);
                        }}
                    >
                        {cell}
                    </div>
                );
            })}
        </div>
    );
};

type DerivationCellProps = {
    derivation: ILedgerDerivation;
    size?: CellSize;
    isSelected: boolean;
    onSelect: () => void;
};

const DerivationCell: FC<DerivationCellProps> = props => {
    const { derivation, size, isSelected, onSelect } = props;

    const formatter = useNumberFormatter();
    const { data: balance } = useBtcWalletFiatBalance(derivation.chains.btc.wallets[0]);

    return (
        <Cell
            size={size}
            isSelected={isSelected}
            className={derivationCellStyles}
            onClick={onSelect}
        >
            <Cell.Leading>
                <Badge>{derivation.index + 1}</Badge>
            </Cell.Leading>
            <Cell.Content>
                <Cell.Row>
                    <Cell.Title>{derivation.meta.name}</Cell.Title>
                    <Cell.Value className={valueStyles}>{balance?.format(formatter)}</Cell.Value>
                </Cell.Row>
            </Cell.Content>
        </Cell>
    );
};
