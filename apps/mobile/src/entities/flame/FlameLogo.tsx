import { View } from 'react-native';
import type { UnistylesVariants } from 'react-native-unistyles';

import { Flame32, Icon } from '@mobile/shared/ui';

import { styles } from './FlameLogo.styles';

type FlameLogoProps = UnistylesVariants<typeof styles>;

export const FlameLogo = (props: FlameLogoProps) => {
    const { background = 'brand', size = 'medium' } = props;

    styles.useVariants({ background, size });

    return (
        <View style={styles.container}>
            <Icon icon={Flame32} />
        </View>
    );
};
