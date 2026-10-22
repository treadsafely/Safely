import { View } from 'react-native';

import { styles } from './SegmentedControl.styles';
import { Text } from '../Text';
import { TouchableOpacity } from '../TouchableOpacity';

type SegmentedControlProps<T extends string> = {
    segments: readonly { value: T; title: string }[];
    value: T;
    onChange: (value: T) => void;
};

export const SegmentedControl = <T extends string>(props: SegmentedControlProps<T>) => {
    const { segments, value, onChange } = props;

    return (
        <View style={styles.container}>
            {segments.map(segment => {
                const isSelected = segment.value === value;
                return (
                    <TouchableOpacity
                        key={segment.value}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isSelected }}
                        style={styles.segment(isSelected)}
                        onPress={() => onChange(segment.value)}
                    >
                        <Text variant="labelM" numberOfLines={1}>
                            {segment.title}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};
