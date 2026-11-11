import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { TEST_ID } from '@mobile/shared/constants';
import { Screen, Text } from '@mobile/shared/ui';

import { SettingsContent } from './components';
import { styles } from './SettingsScreen.styles';

export const SettingsScreen = () => {
    const { t } = useTranslation();

    return (
        <Screen>
            <Screen.Header variant="center">
                <View style={styles.headerPlaceholder} />
                <Screen.Header.Title>
                    <Text textAlign="center" variant="titleS" numberOfLines={1}>
                        {t('settings.title')}
                    </Text>
                </Screen.Header.Title>
                <Screen.Header.CloseButton testID={TEST_ID.settings.closeButton} />
            </Screen.Header>
            <SettingsContent />
        </Screen>
    );
};
