import { View } from 'react-native';

import type { IconProps } from '@mobile/shared/ui/Icon';
import { Icon } from '@mobile/shared/ui/Icon';
import { Text } from '@mobile/shared/ui/Text';
import { TouchableOpacity } from '@mobile/shared/ui/TouchableOpacity';

import { styles } from './ActionsButton.styles';

export type ActionsButtonProps = {
    title: string;
    icon: IconProps['icon'];
    onPress: () => void;
    opacity?: number;
    testID?: string;
    variant?: 'tertiary' | 'transparent';
};

export const ActionsButton = (props: ActionsButtonProps) => {
    const { title, icon, onPress, opacity, testID, variant = 'tertiary' } = props;

    styles.useVariants({ variant });

    return (
        <TouchableOpacity
            testID={testID}
            onPress={onPress}
            style={[styles.container, opacity != null && { opacity }]}
        >
            <View style={styles.iconContainer}>
                <Icon icon={icon} size={28} />
            </View>
            <Text numberOfLines={1} variant="bodyM">
                {title}
            </Text>
        </TouchableOpacity>
    );
};
