import type { AssetCellProps } from '@mobile/entities/asset';
import { AssetCell } from '@mobile/entities/asset';
import { Flame32 } from '@mobile/shared/ui';

import { styles } from './FlameAssetCell.styles';

type FlameAssetCellProps = Omit<AssetCellProps, 'image' | 'footer'>;

export const FlameAssetCell = (props: FlameAssetCellProps) => (
    <AssetCell {...props} image={{ type: 'icon', icon: Flame32, style: styles.icon }} />
);
