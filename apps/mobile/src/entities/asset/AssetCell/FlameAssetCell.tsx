import { Flame32 } from '@mobile/shared/ui';

import type { AssetCellProps } from './AssetCell';
import { AssetCell } from './AssetCell';
import { styles } from './FlameAssetCell.styles';

type FlameAssetCellProps = Omit<AssetCellProps, 'image' | 'footer'>;

export const FlameAssetCell = (props: FlameAssetCellProps) => (
    <AssetCell {...props} image={{ type: 'icon', icon: Flame32, style: styles.icon }} />
);
