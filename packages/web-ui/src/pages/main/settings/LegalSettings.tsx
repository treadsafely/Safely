import type { FC } from 'react';

import { useBootConfig, useLinking, useTranslate } from '@safely/ux';

import { listStyles } from './SettingsSection.styles';
import { Cell, List, PageHeader } from '../../../shared';

export const LegalSettings: FC = () => {
    const t = useTranslate();
    const { openURL } = useLinking();
    const legal = useBootConfig().references.legal;

    return (
        <>
            <PageHeader title={t('legal.title')} hasDivider />

            <List className={listStyles}>
                <List.Group variant="separated">
                    <Cell onClick={() => openURL(legal.terms_url)}>
                        <Cell.Content>
                            <Cell.Title>{t('legal.termsOfUse')}</Cell.Title>
                        </Cell.Content>
                        <Cell.Chevron />
                    </Cell>
                    <Cell onClick={() => openURL(legal.privacy_url)}>
                        <Cell.Content>
                            <Cell.Title>{t('legal.privacyPolicy')}</Cell.Title>
                        </Cell.Content>
                        <Cell.Chevron />
                    </Cell>
                </List.Group>
            </List>
        </>
    );
};
