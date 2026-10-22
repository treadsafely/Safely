import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { useLanguageSwitch } from '@safely/ux';
import { availableLanguages } from '@safely/ux/translations';

import { listStyles } from './SettingsSection.styles';
import { Cell, List, PageHeader, Spinner, Text } from '../../../shared';

export const LanguageSettings: FC = () => {
    const { t, i18n } = useTranslation();
    const { pendingLanguage, select } = useLanguageSwitch();

    return (
        <>
            <PageHeader title={t('language.title')} hasDivider />

            <List className={listStyles}>
                <List.Group variant="separated">
                    {availableLanguages.map(language => {
                        const isSelected = i18n.language === language.code;
                        const isPending = pendingLanguage === language.code;

                        return (
                            <Cell
                                key={language.code}
                                isSelected={isSelected}
                                onClick={() => select(language.code)}
                            >
                                <Cell.Content>
                                    <Cell.Title>
                                        {t(`language.languages.${language.code}`)}
                                    </Cell.Title>
                                    <Text variant="bodyM" tone="secondary">
                                        {language.nativeName}
                                    </Text>
                                </Cell.Content>
                                {isPending && (
                                    <Cell.Trailing>
                                        <Spinner />
                                    </Cell.Trailing>
                                )}
                                {!isPending && isSelected && <Cell.Checkmark />}
                            </Cell>
                        );
                    })}
                </List.Group>
            </List>
        </>
    );
};
