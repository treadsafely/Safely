import type { FC } from 'react';

import {
    useActiveAccountStoreSlot,
    useAppContext,
    useActiveFiat,
    useActiveLanguage,
    useActivePortfolio,
    useBootConfig,
    useLinking,
    useHasPortfolio,
    usePortfolios,
    useTranslate
} from '@safely/ux';

import type { SettingsSection } from './settings';
import {
    listStyles,
    valueRowStyles,
    valueRowTitleStyles,
    valueRowValueStyles,
    versionStyles,
    walletRowStyles
} from './SettingsSidebar.styles';
import { PortfolioTypeBadge, WalletIcon } from '../../entities';
import type { useAccountFlow } from '../../features';
import { AppLayout, Cell, List, PageHeader, Text, useLongPress } from '../../shared';

const CurrentWalletCell: FC<{ isSelected: boolean; onClick: () => void }> = props => {
    const portfolio = useActivePortfolio();

    return (
        <Cell tone="transparent" isSelected={props.isSelected} onClick={props.onClick}>
            <Cell.Leading>
                <WalletIcon icon={portfolio.meta.icon} />
            </Cell.Leading>
            <Cell.Content>
                <Cell.Row className={walletRowStyles}>
                    <Cell.Title>{portfolio.meta.name}</Cell.Title>
                    <PortfolioTypeBadge type={portfolio.type} />
                </Cell.Row>
            </Cell.Content>
        </Cell>
    );
};

const SettingsValueRow: FC<{ title: string; value: string }> = props => (
    <Cell.Row className={valueRowStyles}>
        <Cell.Title className={valueRowTitleStyles}>{props.title}</Cell.Title>
        <Cell.Value className={valueRowValueStyles}>{props.value}</Cell.Value>
    </Cell.Row>
);

export type SettingsSidebarProps = {
    activeSection: SettingsSection | null;
    account: ReturnType<typeof useAccountFlow>;
    onSelectSection: (section: SettingsSection) => void;
};

export const SettingsSidebar: FC<SettingsSidebarProps> = props => {
    const { activeSection, account, onSelectSection } = props;

    const { version } = useAppContext();
    const longPress = useLongPress(() => onSelectSection('devTools'));
    const t = useTranslate();
    const fiat = useActiveFiat();
    const { openURL } = useLinking();
    const supportEmail = useBootConfig().references.support.email;
    const language = useActiveLanguage();
    const portfolios = usePortfolios();
    const hasPortfolio = useHasPortfolio();
    const accountMeta = useActiveAccountStoreSlot('meta');

    return (
        <AppLayout.Secondary>
            <AppLayout.SecondaryContent>
                <PageHeader title={t('settings.title')} hasDivider />

                <List className={listStyles}>
                    {hasPortfolio && (
                        <>
                            <List.Title>{t('settings.groups.currentWallet.title')}</List.Title>
                            <List.Group variant="separated">
                                <CurrentWalletCell
                                    isSelected={activeSection === 'wallet'}
                                    onClick={() => onSelectSection('wallet')}
                                />
                            </List.Group>
                        </>
                    )}

                    <List.Title>{t('settings.groups.account.title')}</List.Title>
                    <List.Group variant="separated">
                        <Cell
                            tone="transparent"
                            isSelected={activeSection === 'account'}
                            onClick={() => onSelectSection('account')}
                        >
                            <Cell.Content>
                                <Cell.Title>{accountMeta?.name}</Cell.Title>
                                <Cell.Subtitle>
                                    {t('settings.walletsCount', { count: portfolios.length })}
                                </Cell.Subtitle>
                            </Cell.Content>
                        </Cell>
                        <Cell tone="transparent" onClick={account.startEdit}>
                            <Cell.Content>
                                <Cell.Title>
                                    {t('settings.groups.account.options.editAccount')}
                                </Cell.Title>
                            </Cell.Content>
                        </Cell>
                        <Cell
                            tone="transparent"
                            isSelected={activeSection === 'addressBook'}
                            onClick={() => onSelectSection('addressBook')}
                        >
                            <Cell.Content>
                                <Cell.Title>
                                    {t('settings.groups.account.options.addressBook')}
                                </Cell.Title>
                            </Cell.Content>
                        </Cell>
                        <Cell tone="transparent" onClick={account.openAdd}>
                            <Cell.Content>
                                <Cell.Title>{t('settings.addAccount')}</Cell.Title>
                            </Cell.Content>
                        </Cell>
                    </List.Group>

                    <List.Title>{t('settings.groups.application.title')}</List.Title>
                    <List.Group variant="separated">
                        <Cell
                            tone="transparent"
                            isSelected={activeSection === 'security'}
                            onClick={() => onSelectSection('security')}
                        >
                            <Cell.Content>
                                <Cell.Title>
                                    {t('settings.groups.application.options.security')}
                                </Cell.Title>
                            </Cell.Content>
                        </Cell>
                        <Cell
                            tone="transparent"
                            isSelected={activeSection === 'language'}
                            onClick={() => onSelectSection('language')}
                        >
                            <Cell.Content>
                                <SettingsValueRow
                                    title={t('settings.groups.application.options.language')}
                                    value={t(`language.languages.${language}`)}
                                />
                            </Cell.Content>
                        </Cell>
                        <Cell
                            tone="transparent"
                            isSelected={activeSection === 'currency'}
                            onClick={() => onSelectSection('currency')}
                        >
                            <Cell.Content>
                                <SettingsValueRow
                                    title={t('currency.title')}
                                    value={fiat.id.symbol}
                                />
                            </Cell.Content>
                        </Cell>
                    </List.Group>

                    <List.Title>{t('settings.groups.info.title')}</List.Title>
                    <List.Group variant="separated">
                        <Cell tone="transparent" onClick={() => openURL(`mailto:${supportEmail}`)}>
                            <Cell.Content>
                                <SettingsValueRow
                                    title={t('settings.groups.info.options.support')}
                                    value={supportEmail}
                                />
                            </Cell.Content>
                        </Cell>
                        <Cell
                            tone="transparent"
                            isSelected={activeSection === 'legal'}
                            onClick={() => onSelectSection('legal')}
                        >
                            <Cell.Content>
                                <Cell.Title>{t('settings.groups.info.options.legal')}</Cell.Title>
                            </Cell.Content>
                        </Cell>
                    </List.Group>

                    <List.Group variant="separated">
                        <Cell tone="accentRed" onClick={account.startSignOut}>
                            <Cell.Content>
                                <Cell.Title>
                                    {t('settings.signOutAccount.title', {
                                        name: accountMeta?.name ?? ''
                                    })}
                                </Cell.Title>
                            </Cell.Content>
                        </Cell>
                    </List.Group>

                    <Text variant="bodyM" tone="tertiary" className={versionStyles} {...longPress}>
                        {`Safely · ${version}`}
                    </Text>
                </List>
            </AppLayout.SecondaryContent>
        </AppLayout.Secondary>
    );
};
