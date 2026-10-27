import { View } from 'react-native';
import type { UnistylesVariants } from 'react-native-unistyles';

import { Flame32, Icon } from '@mobile/shared/ui';

import { styles } from './FlameLogo.styles';

type FlameLogoProps = UnistylesVariants<typeof styles>;

const ICON_SIZE = { medium: 32, large: 32, xlarge: 48 } as const;

export const FlameLogo = (props: FlameLogoProps) => {
    const { background = 'brand', size = 'medium' } = props;

    styles.useVariants({ background, size });

    return (
        <View style={styles.container}>
            <Icon icon={Flame32} size={ICON_SIZE[size]} />
        </View>
    );
};
