import { useTranslation } from 'react-i18next';

import { useNewsNotificationsEnabledQuery, useSetNewsNotificationsEnabled } from '@safely/ux';

import { Cell, List, Switch } from '@mobile/shared/ui';

export const ApplicationSection = () => {
    const { t } = useTranslation();
    const { data: isEnabled = true } = useNewsNotificationsEnabledQuery();
    const { mutate: setEnabled } = useSetNewsNotificationsEnabled();

    return (
        <List>
            <List.Title>{t('notifications.application.title')}</List.Title>
            <List.Group variant="divided">
                <Cell>
                    <Cell.Content>
                        <Cell.Row>
                            <Cell.Title>{t('notifications.application.news.title')}</Cell.Title>
                        </Cell.Row>
                        <Cell.Row>
                            <Cell.Subtitle numberOfLines={0}>
                                {t('notifications.application.news.subtitle')}
                            </Cell.Subtitle>
                        </Cell.Row>
                    </Cell.Content>
                    <Switch value={isEnabled} onPress={() => setEnabled(!isEnabled)} />
                </Cell>
            </List.Group>
        </List>
    );
};
