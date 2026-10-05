import { useTranslation } from 'react-i18next';

import { usePushNotificationsEnabledQuery, useSetPushNotificationsEnabled } from '@safely/ux';

import { Cell, List, Switch } from '@mobile/shared/ui';

type DeviceSectionProps = {
    isPermissionDenied: boolean;
};

export const DeviceSection = ({ isPermissionDenied }: DeviceSectionProps) => {
    const { t } = useTranslation();
    const { data: isEnabled = false } = usePushNotificationsEnabledQuery();
    const { mutate: setEnabled } = useSetPushNotificationsEnabled();

    return (
        <List>
            <List.Title>{t('notifications.device.title')}</List.Title>
            <List.Group variant="divided">
                <Cell>
                    <Cell.Content>
                        <Cell.Row>
                            <Cell.Title>{t('notifications.device.push.title')}</Cell.Title>
                        </Cell.Row>
                        <Cell.Row>
                            <Cell.Subtitle numberOfLines={0}>
                                {t('notifications.device.push.subtitle')}
                            </Cell.Subtitle>
                        </Cell.Row>
                    </Cell.Content>
                    <Switch
                        value={isEnabled && !isPermissionDenied}
                        disabled={isPermissionDenied}
                        onPress={() => setEnabled(!isEnabled)}
                    />
                </Cell>
            </List.Group>
        </List>
    );
};
