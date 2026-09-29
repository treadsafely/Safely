import { useTranslation } from 'react-i18next';

import { useAppContext } from '@safely/ux';

import { Banner } from '@mobile/shared/ui';

import { styles } from '../NotificationsScreen.styles';

export const DisabledBanner = () => {
    const { t } = useTranslation();
    const { pushNotifications } = useAppContext();

    const handlePress = () => pushNotifications.openSystemSettings();

    return (
        <Banner variant="warn" style={styles.banner} onPress={handlePress}>
            <Banner.Content>
                <Banner.Text>{t('notifications.disabledBanner.text')}</Banner.Text>
                <Banner.Action onPress={handlePress}>
                    {t('notifications.disabledBanner.action')}
                </Banner.Action>
            </Banner.Content>
        </Banner>
    );
};
