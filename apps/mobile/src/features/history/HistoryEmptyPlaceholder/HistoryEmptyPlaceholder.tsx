import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@mobile/shared/ui';

import { styles } from './HistoryEmptyPlaceholder.styles';

export const HistoryEmptyPlaceholder = () => {
    const { t } = useTranslation();

    return (
        <View style={styles.emptyContainer}>
            <Text variant="bodyM" color="tertiary" textAlign="center">
                {t('history.empty.subtitle')}
            </Text>
        </View>
    );
};
