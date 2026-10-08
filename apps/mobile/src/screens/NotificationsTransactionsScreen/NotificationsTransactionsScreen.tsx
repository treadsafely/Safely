import { useNavigation } from '@react-navigation/core';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { NotificationEventKey } from '@safely/core';
import { RECEIVED_NOTIFICATION_EVENT_KEYS, SENT_NOTIFICATION_EVENT_KEYS } from '@safely/core';
import { useNotificationSettings, useSetNotificationEventEnabled } from '@safely/ux';

import { Cell, List, Screen, Switch } from '@mobile/shared/ui';
import { ArrowLeft16, Icon } from '@mobile/shared/ui/Icon';

import { styles } from './NotificationsTransactionsScreen.styles';

type EventsGroupProps = {
    title: string;
    keys: readonly NotificationEventKey[];
};

const EventsGroup = ({ title, keys }: EventsGroupProps) => {
    const { t } = useTranslation();
    const settings = useNotificationSettings();
    const { mutate: setEventEnabled } = useSetNotificationEventEnabled();

    return (
        <List>
            <List.Title>{title}</List.Title>
            <List.Group variant="divided">
                {keys.map(key => (
                    <Cell key={key}>
                        <Cell.Content>
                            <Cell.Row>
                                <Cell.Title>
                                    {t(`notifications.transactions.events.${key}.title`)}
                                </Cell.Title>
                            </Cell.Row>
                            <Cell.Row>
                                <Cell.Subtitle numberOfLines={0}>
                                    {t(`notifications.transactions.events.${key}.subtitle`)}
                                </Cell.Subtitle>
                            </Cell.Row>
                        </Cell.Content>
                        <Switch
                            value={settings.events[key]}
                            onPress={() =>
                                setEventEnabled({ key, isEnabled: !settings.events[key] })
                            }
                        />
                    </Cell>
                ))}
            </List.Group>
        </List>
    );
};

export const NotificationsTransactionsScreen = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();

    return (
        <Screen>
            <Screen.Header variant="center">
                <Screen.Header.Button onPress={navigation.goBack}>
                    <Icon icon={ArrowLeft16} />
                </Screen.Header.Button>
                <Screen.Header.Title>{t('notifications.transactions.title')}</Screen.Header.Title>
                <View style={styles.headerPlaceholder} />
            </Screen.Header>
            <Screen.Scrollable contentContainerStyle={styles.listContent}>
                <View style={styles.container}>
                    <EventsGroup
                        title={t('notifications.transactions.incoming')}
                        keys={RECEIVED_NOTIFICATION_EVENT_KEYS}
                    />
                    <EventsGroup
                        title={t('notifications.transactions.outgoing')}
                        keys={SENT_NOTIFICATION_EVENT_KEYS}
                    />
                </View>
            </Screen.Scrollable>
        </Screen>
    );
};
