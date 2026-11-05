import type { FC } from 'react';

import type { BtcAssetAmount, LedgerAccount } from '@safely/core';
import { ellipsisMiddle } from '@safely/core';
import { getLedgerDerivationName, useFormattedAmount, useTranslate } from '@safely/ux';

import { labelStyles } from './LedgerAccountCell.styles';
import { LedgerDerivationRow } from './LedgerDerivationRow';
import { Checkbox } from '../../shared';

type RealLedgerAccountCellProps = {
    account: LedgerAccount;
    balance: BtcAssetAmount | undefined;
    isSkeleton?: false | undefined;
    isSelected: boolean;
    name?: string;
    onToggle: () => void;
};

type SkeletonLedgerAccountCellProps = {
    account: Pick<LedgerAccount, 'index'>;
    balance?: undefined;
    isSkeleton: true;
    isSelected?: undefined;
    name?: undefined;
    onToggle?: undefined;
};

export type LedgerAccountCellProps = RealLedgerAccountCellProps | SkeletonLedgerAccountCellProps;

export const LedgerAccountCell: FC<LedgerAccountCellProps> = props => {
    const { account, balance, isSelected = false, name, onToggle, isSkeleton = false } = props;

    const t = useTranslate();
    const formattedBalance = useFormattedAmount(balance);
    const isBalanceLoading = !isSkeleton && balance === undefined;

    const subtitle =
        isSkeleton || isBalanceLoading || !('address' in account)
            ? undefined
            : `${formattedBalance} · ${ellipsisMiddle(account.address)}`;

    const row = (
        <LedgerDerivationRow
            index={account.index}
            title={isSkeleton ? undefined : (name ?? getLedgerDerivationName(t, account.index))}
            subtitle={subtitle}
            isSubtitleLoading={isBalanceLoading}
            isSkeleton={isSkeleton}
            isInteractive={!isSkeleton}
            accessory={
                <Checkbox
                    checked={isSelected}
                    disabled={isSkeleton}
                    onCheckedChange={() => onToggle?.()}
                />
            }
        />
    );

    return isSkeleton ? row : <label className={labelStyles}>{row}</label>;
};
