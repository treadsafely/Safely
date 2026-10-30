import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { type BtcAssetAmount, ellipsisMiddle, type LedgerAccount } from '@safely/core';
import { getLedgerDerivationName, useFormattedAmount } from '@safely/ux';

import { LedgerDerivationRow } from '@mobile/features/ledger';
import { Checkbox } from '@mobile/shared/ui';

type RealLedgerAccountCellProps = {
    account: LedgerAccount;
    balance: BtcAssetAmount | undefined;
    isSkeleton?: false | undefined;
    isSelected: boolean;
    name?: string;
    onPress: () => void;
};

type SkeletonLedgerAccountCellProps = {
    account: Pick<LedgerAccount, 'index'>;
    balance?: undefined;
    isSkeleton: true;
    isSelected?: undefined;
    name?: undefined;
    onPress?: undefined;
};

type LedgerAccountCellProps = SkeletonLedgerAccountCellProps | RealLedgerAccountCellProps;

export const LedgerAccountCell = (props: LedgerAccountCellProps) => {
    const { account, balance, isSelected = false, name, onPress, isSkeleton = false } = props;

    const { t } = useTranslation();
    const formattedBalance = useFormattedAmount(balance);
    const isBalanceLoading = !isSkeleton && balance === undefined;

    const subtitle =
        isSkeleton || isBalanceLoading || !('address' in account)
            ? undefined
            : `${formattedBalance} · ${ellipsisMiddle(account.address)}`;

    return (
        <LedgerDerivationRow
            index={account.index}
            title={isSkeleton ? undefined : (name ?? getLedgerDerivationName(t, account.index))}
            subtitle={subtitle}
            isSubtitleLoading={isBalanceLoading}
            isSkeleton={isSkeleton}
            onPress={onPress}
            accessory={
                <View pointerEvents="none">
                    <Checkbox isChecked={isSelected} disabled={isSkeleton} />
                </View>
            }
        />
    );
};
