import { useNavigation } from '@react-navigation/core';

import { useActiveBtcRatedAmount, useActiveFlameRatedAmount } from '@safely/ux';

import { AssetCellSkeleton, BtcAssetCell } from '@mobile/entities/asset';
import { FlameAssetCell } from '@mobile/entities/flame';
import { List } from '@mobile/shared/ui';

import { styles } from './AssetsList.styles';

export const AssetsList = () => {
    const navigation = useNavigation();
    const { data: btc } = useActiveBtcRatedAmount();
    const { data: flame, isError: isFlameError } = useActiveFlameRatedAmount();

    return (
        <List>
            <List.Group style={styles.list} variant="separated">
                {btc ? (
                    <BtcAssetCell
                        onPress={() => {
                            void navigation.navigate('TabsNavigator', {
                                screen: 'HomeStack',
                                params: { screen: 'BtcScreen' }
                            });
                        }}
                        cryptoAssetAmount={btc.amount}
                        price={btc.price ?? null}
                    />
                ) : (
                    <AssetCellSkeleton />
                )}
                {flame ? (
                    <FlameAssetCell
                        onPress={() => {
                            void navigation.navigate('TabsNavigator', {
                                screen: 'HomeStack',
                                params: { screen: 'FlameScreen' }
                            });
                        }}
                        cryptoAssetAmount={flame.amount}
                        price={flame.price ?? null}
                    />
                ) : (
                    flame === undefined && !isFlameError && <AssetCellSkeleton />
                )}
            </List.Group>
        </List>
    );
};
