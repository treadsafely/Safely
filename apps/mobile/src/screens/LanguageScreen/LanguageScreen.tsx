import { useNavigation } from '@react-navigation/core';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useLanguageSwitch } from '@safely/ux';

import { availableLanguages } from '@mobile/shared/i18n';
import { Cell, CircularSpinner, List, Screen, Text } from '@mobile/shared/ui';
import { ArrowLeft16, Checkmark28, Icon } from '@mobile/shared/ui/Icon';

import { styles } from './LanguageScreen.styles';

export const LanguageScreen = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation();
    const { pendingLanguage, select } = useLanguageSwitch();

    return (
        <Screen>
            <Screen.Header variant="center">
                <Screen.Header.Button onPress={navigation.goBack}>
                    <Icon icon={ArrowLeft16} />
                </Screen.Header.Button>
                <Screen.Header.Title>{t('language.title')}</Screen.Header.Title>
                <View style={styles.headerPlaceholder} />
            </Screen.Header>
            <Screen.Scrollable contentContainerStyle={styles.listContent}>
                <List style={styles.container}>
                    <List.Group variant="divided">
                        {availableLanguages.map(language => {
                            const isPending = pendingLanguage === language.code;
                            const isSelected = i18n.language === language.code;

                            return (
                                <Cell key={language.code} onPress={() => select(language.code)}>
                                    <Cell.Content style={styles.cellContent}>
                                        <Cell.Row>
                                            <Cell.Title>
                                                {t(`language.languages.${language.code}`)}
                                            </Cell.Title>
                                        </Cell.Row>
                                        <Text variant="bodyM" color="secondary">
                                            {language.nativeName}
                                        </Text>
                                    </Cell.Content>
                                    {isPending && <CircularSpinner size={28} />}
                                    {!isPending && isSelected && (
                                        <Icon icon={Checkmark28} color="accent" />
                                    )}
                                </Cell>
                            );
                        })}
                    </List.Group>
                </List>
            </Screen.Scrollable>
        </Screen>
    );
};
