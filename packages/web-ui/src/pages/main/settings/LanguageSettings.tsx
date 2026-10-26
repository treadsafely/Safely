import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import type { LanguageCode } from '@safely/ux/translations';
import { availableLanguages } from '@safely/ux/translations';

import { listStyles } from './SettingsSection.styles';
import { Cell, List, PageHeader, Text } from '../../../shared';

export const LanguageSettings: FC = () => {
    const { t, i18n } = useTranslation();

    const select = (code: LanguageCode): void => {
        if (i18n.language !== code) {
            void i18n.changeLanguage(code);
        }
    };

    return (
        <>
            <PageHeader title={t('language.title')} hasDivider />

            <List className={listStyles}>
                <List.Group variant="separated">
                    {availableLanguages.map(language => (
                        <Cell
                            key={language.code}
                            isSelected={i18n.language === language.code}
                            onClick={() => select(language.code)}
                        >
                            <Cell.Content>
                                <Cell.Title>{t(`language.languages.${language.code}`)}</Cell.Title>
                                <Text variant="bodyM" tone="secondary">
                                    {language.nativeName}
                                </Text>
                            </Cell.Content>
                            {i18n.language === language.code && <Cell.Checkmark />}
                        </Cell>
                    ))}
                </List.Group>
            </List>
        </>
    );
};
