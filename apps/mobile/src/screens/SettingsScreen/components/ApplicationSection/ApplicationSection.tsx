import { useNavigation } from '@react-navigation/core';
import { useTranslation } from 'react-i18next';

import { Cell, List } from '@mobile/shared/ui';

export const ApplicationSection = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();

    return (
        <List>
            <List.Title>{t('settings.groups.application.title')}</List.Title>
            <List.Group variant="divided">
                <Cell
                    onPress={() =>
                        navigation.navigate('SettingsModal', { screen: 'SecurityModal' })
                    }
                >
                    <Cell.Content>
                        <Cell.Row>
                            <Cell.Title>
                                {t('settings.groups.application.options.security')}
                            </Cell.Title>
                        </Cell.Row>
                    </Cell.Content>
                    <Cell.Chevron />
                </Cell>
                <Cell
                    onPress={() =>
                        navigation.navigate('SettingsModal', { screen: 'LanguageModal' })
                    }
                >
                    <Cell.Content>
                        <Cell.Row>
                            <Cell.Title>
                                {t('settings.groups.application.options.language')}
                            </Cell.Title>
                            <Cell.Value variant="bodyL" color="tertiary">
                                {t('currentLanguageName')}
                            </Cell.Value>
                        </Cell.Row>
                    </Cell.Content>
                </Cell>
            </List.Group>
        </List>
    );
};
