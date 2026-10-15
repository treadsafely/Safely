import { View } from 'react-native';

import type { CryptoAsset } from '@safely/core';
import { FLAME_ASSET } from '@safely/core';

import { FlameLogo } from '@mobile/entities/flame';
import { Image } from '@mobile/shared/ui';

import { styles } from './AssetSelector.styles';

export const AssetSelector = ({ asset }: { asset: CryptoAsset }) =>
    asset.id.isEq(FLAME_ASSET.id) ? (
        <View style={styles.image}>
            <FlameLogo />
        </View>
    ) : (
        <Image source={asset.image} style={styles.image} />
    );
