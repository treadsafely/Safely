import { useNavigation } from '@react-navigation/core';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { BtcApiUtxoWithOptionalTx } from '@safely/core';
import { BTC_ASSET, BtcAssetAmount } from '@safely/core';
import { useActivePortfolioRate, useNumberFormatter, btcTxToActivityItem } from '@safely/ux';

import { Text, TouchableOpacity } from '@mobile/shared/ui';

import { styles } from './ReceivingBadge.styles';

export const ReceivingBadges = ({
    utxos,
    purchaseTxids
}: {
    utxos: BtcApiUtxoWithOptionalTx[];
    purchaseTxids: ReadonlySet<string>;
}) => {
    const { t } = useTranslation();
    const formatter = useNumberFormatter();
    const navigation = useNavigation();
    const { data: currentRate } = useActivePortfolioRate(BTC_ASSET);

    const handleReceivingPress = useCallback(
        (u: BtcApiUtxoWithOptionalTx) => {
            if (!u?.tx) {
                return;
            }

            const activity = btcTxToActivityItem(u.tx, currentRate ?? null);
            if (activity) {
                navigation.navigate('TransactionScreen', { activity });
            }
        },
        [navigation, currentRate]
    );

    if (utxos.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {utxos.map(u => (
                <TouchableOpacity
                    key={`${u.txid}:${u.vout}`}
                    style={styles.badge}
                    onPress={() => handleReceivingPress(u)}
                >
                    <Text variant="bodyM" color="primary">
                        {t(
                            purchaseTxids.has(u.txid)
                                ? 'pendingFunds.purchase'
                                : 'pendingFunds.receiving',
                            {
                                amount: BtcAssetAmount.fromWeiAmount(u.value).format(formatter)
                            }
                        )}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};
