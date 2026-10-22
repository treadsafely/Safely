import type { FC } from 'react';

import { PortfolioType } from '@safely/core';
import { useActivePortfolioEntitiesQuery, useDateFormatter, useTranslate } from '@safely/ux';
import Switch16 from '@safely/ux/assets/icons/16/switch-16.svg?react';

import { destructiveGroupStyles, listStyles, walletRowStyles } from './SettingsSection.styles';
import { PortfolioTypeBadge, WalletIcon } from '../../../entities';
import { useWalletFlow, WalletModals } from '../../../features';
import { Cell, Icon, List, PageHeader } from '../../../shared';

export const WalletSettings: FC = () => {
    const t = useTranslate();
    const flow = useWalletFlow();
    const formatDate = useDateFormatter({
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const portfolio = useActivePortfolioEntitiesQuery()?.data?.portfolio ?? null;

    if (portfolio === null) {
        return null;
    }

    const revealedStatus =
        portfolio.type === PortfolioType.BIP39 ? portfolio.secretRevealedStatus : null;

    return (
        <>
            <PageHeader title={t('settings.groups.currentWallet.paneTitle')} hasDivider />

            <List className={listStyles}>
                <List.Group variant="separated">
                    <Cell onClick={flow.openSelect}>
                        <Cell.Leading>
                            <WalletIcon icon={portfolio.meta.icon} />
                        </Cell.Leading>
                        <Cell.Content>
                            <Cell.Row className={walletRowStyles}>
                                <Cell.Title>{portfolio.meta.name}</Cell.Title>
                                <PortfolioTypeBadge type={portfolio.type} />
                            </Cell.Row>
                        </Cell.Content>
                        <Cell.Trailing>
                            <Icon asset={Switch16} tone="tertiary" />
                        </Cell.Trailing>
                    </Cell>

                    <Cell onClick={flow.openEdit}>
                        <Cell.Content>
                            <Cell.Title>
                                {t('settings.groups.currentWallet.options.editWallet')}
                            </Cell.Title>
                        </Cell.Content>
                        <Cell.Chevron />
                    </Cell>

                    {portfolio.type === PortfolioType.BIP39 && (
                        <Cell onClick={flow.openReveal}>
                            <Cell.Content>
                                <Cell.Title>
                                    {t('security.groups.wallet.recovery.title')}
                                </Cell.Title>
                                <Cell.Subtitle>
                                    {revealedStatus === null
                                        ? t('security.groups.wallet.recovery.subtitle')
                                        : t('security.groups.wallet.recovery.revealed', {
                                              date: formatDate.format(revealedStatus.revealedAt),
                                              device: revealedStatus.revealedFromDevice
                                          })}
                                </Cell.Subtitle>
                            </Cell.Content>
                            <Cell.Chevron />
                        </Cell>
                    )}
                </List.Group>

                <List.Group variant="separated" className={destructiveGroupStyles}>
                    <Cell tone="accentRed" onClick={flow.openRemove}>
                        <Cell.Content>
                            <Cell.Title>
                                {t('settings.removePortfolio.title', { name: portfolio.meta.name })}
                            </Cell.Title>
                        </Cell.Content>
                    </Cell>
                </List.Group>
            </List>

            <WalletModals flow={flow} />
        </>
    );
};
