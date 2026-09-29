import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { usePushPermissionQuery, useSetPushNotificationsEnabled } from '@safely/ux';

import { useOnboardingFlow } from '@mobile/features/onboarding';
import { Button, Icon, Notifications96, Screen, Text } from '@mobile/shared/ui';

import { styles } from './OnboardingNotificationsScreen.styles';

export const OnboardingNotificationsScreen = () => {
    const { t } = useTranslation();
    const { onNotificationsFinished } = useOnboardingFlow();
    const { data: permission } = usePushPermissionQuery();
    const { mutateAsync: setPushEnabled } = useSetPushNotificationsEnabled();

    const isAlreadyDecided = permission !== undefined && permission !== 'undetermined';

    useEffect(() => {
        if (permission === 'granted') {
            void setPushEnabled(true);
        }
    }, [permission, setPushEnabled]);

    useEffect(() => {
        if (isAlreadyDecided) {
            onNotificationsFinished();
        }
    }, [isAlreadyDecided, onNotificationsFinished]);

    if (permission === undefined || isAlreadyDecided) {
        return (
            <Screen>
                <Screen.Content>{null}</Screen.Content>
            </Screen>
        );
    }

    return (
        <Screen>
            <Screen.Header withCompensateHeight={false}>
                <View />
                <Screen.Header.Button type="small" onPress={onNotificationsFinished}>
                    <Text variant="labelM">{t('common.later')}</Text>
                </Screen.Header.Button>
            </Screen.Header>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Icon icon={Notifications96} />
                </View>
                <View style={styles.textContainer}>
                    <Text textAlign="center" variant="titleM">
                        {t('onboarding.notifications.title')}
                    </Text>
                    <Text textAlign="center" variant="bodyL" color="secondary">
                        {t('onboarding.notifications.description')}
                    </Text>
                </View>
            </View>
            <View style={styles.buttonContainer}>
                <Button type="primary" size="large" onPress={() => setPushEnabled(true)}>
                    {t('onboarding.notifications.enable')}
                </Button>
            </View>
        </Screen>
    );
};
