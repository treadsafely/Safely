import { View } from 'react-native';

import type { CryptoAsset } from '@safely/core';

import { AssetLogo } from '@mobile/entities/asset';

import { styles } from './AssetSelector.styles';

export const AssetSelector = ({ asset }: { asset: CryptoAsset }) => (
    <View style={styles.container}>
        <AssetLogo asset={asset} />
    </View>
);
