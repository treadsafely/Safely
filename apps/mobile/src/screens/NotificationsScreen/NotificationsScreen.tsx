import { useNavigation } from '@react-navigation/core';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { usePushNotificationsEnabledQuery, usePushPermissionQuery } from '@safely/ux';

import { Screen } from '@mobile/shared/ui';
import { ArrowLeft16, Icon } from '@mobile/shared/ui/Icon';

import { AccountSection, ApplicationSection, DeviceSection, DisabledBanner } from './components';
import { styles } from './NotificationsScreen.styles';

export const NotificationsScreen = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const { data: permission } = usePushPermissionQuery();
    const { data: isPushEnabled = false } = usePushNotificationsEnabledQuery();

    const isPermissionDenied = permission === 'denied';
    const isPushActive = isPushEnabled && permission === 'granted';

    return (
        <Screen>
            <Screen.Header variant="center">
                <Screen.Header.Button onPress={navigation.goBack}>
                    <Icon icon={ArrowLeft16} />
                </Screen.Header.Button>
                <Screen.Header.Title>{t('notifications.title')}</Screen.Header.Title>
                <View style={styles.headerPlaceholder} />
            </Screen.Header>
            <Screen.Scrollable contentContainerStyle={styles.listContent}>
                <View style={styles.container}>
                    {isPermissionDenied && <DisabledBanner />}
                    <DeviceSection isPermissionDenied={isPermissionDenied} />
                    {isPushActive && (
                        <>
                            <AccountSection />
                            <ApplicationSection />
                        </>
                    )}
                </View>
            </Screen.Scrollable>
        </Screen>
    );
};
