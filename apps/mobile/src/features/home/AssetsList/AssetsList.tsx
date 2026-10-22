import { useNavigation } from '@react-navigation/core';
import type { ComponentType } from 'react';

import type { RatedCryptoAssetAmount, Recipient } from '@safely/core';
import { BLOCKCHAIN_NAME } from '@safely/core';
import type { PortfolioAsset } from '@safely/ux';
import { useActivePortfolioWallets, usePortfolioAssets } from '@safely/ux';

import type { AssetCellProps } from '@mobile/entities/asset';
import { AssetCellSkeleton, BtcAssetCell } from '@mobile/entities/asset';
import { FlameAssetCell } from '@mobile/entities/flame';
import { List } from '@mobile/shared/ui';

import { styles } from './AssetsList.styles';

type ChainAssetItem = {
    Cell: ComponentType<Omit<AssetCellProps, 'image' | 'footer'>>;
    screen: 'BtcScreen' | 'FlameScreen';
};

const ITEM_BY_CHAIN: Record<Recipient['blockchain'], ChainAssetItem> = {
    [BLOCKCHAIN_NAME.BTC]: { Cell: BtcAssetCell, screen: 'BtcScreen' },
    [BLOCKCHAIN_NAME.FLAME]: { Cell: FlameAssetCell, screen: 'FlameScreen' }
};

const AssetItem = ({ asset, rated }: { asset: PortfolioAsset; rated: RatedCryptoAssetAmount }) => {
    const navigation = useNavigation();
    const { Cell, screen } = ITEM_BY_CHAIN[asset.blockchain];

    return (
        <Cell
            onPress={() => {
                void navigation.navigate('TabsNavigator', {
                    screen: 'HomeStack',
                    params: { screen }
                });
            }}
            cryptoAssetAmount={rated.amount}
            price={rated.price ?? null}
        />
    );
};

const AssetRow = ({ asset }: { asset: PortfolioAsset }) => {
    if (asset.rated === null) {
        return null;
    }

    if (asset.rated === undefined) {
        return <AssetCellSkeleton />;
    }

    return <AssetItem asset={asset} rated={asset.rated} />;
};

export const AssetsList = () => {
    const assets = usePortfolioAssets(useActivePortfolioWallets());

    return (
        <List>
            <List.Group style={styles.list} variant="separated">
                {assets.map(asset => (
                    <AssetRow key={asset.blockchain} asset={asset} />
                ))}
            </List.Group>
        </List>
    );
};
