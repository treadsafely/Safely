import type { FC } from 'react';

import {
    useActivePortfolioEntitiesQuery,
    usePortfolios,
    useSetActivePortfolio,
    useTranslate
} from '@safely/ux';
import Message16 from '@safely/ux/assets/icons/16/message-16.svg?react';
import PlusAlternate16 from '@safely/ux/assets/icons/16/plus-alternate-16.svg?react';
import ShieldExclamationmark16 from '@safely/ux/assets/icons/16/shield-exclamationmark-16.svg?react';
import Sliders16 from '@safely/ux/assets/icons/16/sliders-16.svg?react';

import { sidebarStyles } from './MainSidebar.styles';
import { WalletCell } from '../../entities';
import { AppLayout, Cell, ColorDot, Icon, List } from '../../shared';

export type MainSidebarProps = {
    hasUpdates?: boolean;
    safetyNotice?: 'attention' | 'unprotected';
    isUpdatesOpen?: boolean;
    isSafetyOpen?: boolean;
    isSettingsOpen?: boolean;
    onAddWallet: () => void;
    onSelectWallet: () => void;
    onOpenUpdates: () => void;
    onOpenSafety: () => void;
    onOpenSettings: () => void;
};

export const MainSidebar: FC<MainSidebarProps> = props => {
    const {
        hasUpdates,
        safetyNotice,
        isUpdatesOpen,
        isSafetyOpen,
        isSettingsOpen,
        onAddWallet,
        onSelectWallet,
        onOpenUpdates,
        onOpenSafety,
        onOpenSettings
    } = props;

    const t = useTranslate();
    const portfolios = usePortfolios();
    const { mutate: setActivePortfolio } = useSetActivePortfolio();
    const activePortfolioId = useActivePortfolioEntitiesQuery().data?.portfolio.id;

    return (
        <AppLayout.Sidebar className={sidebarStyles}>
            <List>
                <List.Group variant="separated">
                    {portfolios.map(portfolio => (
                        <WalletCell
                            key={portfolio.id.toString()}
                            portfolio={portfolio}
                            isActive={
                                activePortfolioId !== undefined &&
                                portfolio.id.isEq(activePortfolioId)
                            }
                            onSelect={() => {
                                setActivePortfolio({ id: portfolio.id });
                                onSelectWallet();
                            }}
                        />
                    ))}
                </List.Group>
            </List>

            <List>
                <List.Group variant="separated">
                    <Cell onClick={onAddWallet}>
                        <Cell.Leading>
                            <Icon asset={PlusAlternate16} tone="tertiary" />
                        </Cell.Leading>
                        <Cell.Content>
                            <Cell.Title>{t('addWallet.title')}</Cell.Title>
                        </Cell.Content>
                    </Cell>

                    <Cell isSelected={isUpdatesOpen} onClick={onOpenUpdates}>
                        <Cell.Leading>
                            <Icon asset={Message16} tone="tertiary" />
                        </Cell.Leading>
                        <Cell.Content>
                            <Cell.Title>{t('tabs.updates')}</Cell.Title>
                        </Cell.Content>
                        {hasUpdates && (
                            <Cell.Trailing>
                                <ColorDot tone="red" size="small" />
                            </Cell.Trailing>
                        )}
                    </Cell>

                    <Cell isSelected={isSafetyOpen} onClick={onOpenSafety}>
                        <Cell.Leading>
                            <Icon asset={ShieldExclamationmark16} tone="tertiary" />
                        </Cell.Leading>
                        <Cell.Content>
                            <Cell.Title>{t('tabs.safety')}</Cell.Title>
                        </Cell.Content>
                        {safetyNotice !== undefined && (
                            <Cell.Trailing>
                                {safetyNotice === 'attention' ? (
                                    <ColorDot tone="red" size="small" />
                                ) : (
                                    <ColorDot tone="orange" size="small" />
                                )}
                            </Cell.Trailing>
                        )}
                    </Cell>

                    <Cell isSelected={isSettingsOpen} onClick={onOpenSettings}>
                        <Cell.Leading>
                            <Icon asset={Sliders16} tone="tertiary" />
                        </Cell.Leading>
                        <Cell.Content>
                            <Cell.Title>{t('settings.title')}</Cell.Title>
                        </Cell.Content>
                    </Cell>
                </List.Group>
            </List>
        </AppLayout.Sidebar>
    );
};
