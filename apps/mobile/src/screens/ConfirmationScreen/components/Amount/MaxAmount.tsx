import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { CryptoAssetAmount } from '@safely/core';
import { useFiatEquivalent, useNumberFormatter } from '@safely/ux';

import { Text } from '@mobile/shared/ui';

import { TransactionCell } from '../TransactionCell';

export type MaxAmountProps = {
    amount: CryptoAssetAmount | undefined;
};

export const MaxAmount = ({ amount }: MaxAmountProps) => {
    const { t } = useTranslation();

    return (
        <TransactionCell
            title={t('confirmation.amount')}
            value={t('confirmation.allAvailableBalance')}
            subvalue={
                amount ? (
                    <MaxAmountValue amount={amount} />
                ) : (
                    <Text
                        variant="bodyM"
                        color="secondary"
                        skeletonVariant="transparentElement"
                        skeletonWidth={64}
                    />
                )
            }
        />
    );
};

const MaxAmountValue = ({ amount }: { amount: CryptoAssetAmount }) => {
    const formatter = useNumberFormatter();
    const { data: fiat } = useFiatEquivalent(amount);

    return (
        <View>
            <Text variant="bodyM" color="secondary">
                {amount.format(formatter)}
            </Text>
            {!!fiat && (
                <Text variant="bodyM" color="secondary">
                    {fiat.format(formatter)}
                </Text>
            )}
        </View>
    );
};
