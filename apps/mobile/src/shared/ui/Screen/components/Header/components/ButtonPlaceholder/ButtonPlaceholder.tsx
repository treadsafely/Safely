import { View } from 'react-native';

import { Button } from '@mobile/shared/ui/Screen/components/Header/components/Button';

import { styles } from './ButtonPlaceholder.styles';

export const ButtonPlaceholder = () => (
    <View style={styles.container} pointerEvents="none">
        <Button />
    </View>
);
