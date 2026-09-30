import type { FC, ReactNode } from 'react';
import { useCallback, useState } from 'react';

import type { ActivityItem, BtcActivityItem } from '@safely/ux';
import {
    AccountLinkState,
    isBtcActivityItem,
    useAccountLinkState,
    useBetaFeedWatched,
    useHasPortfolio,
    useIsActivePortfolioWatchOnly,
    useIsAttentionRequired
} from '@safely/ux';

import { MainContent, MainEmptyState } from './content';
import type { MainLocation, MainModal, MainView } from './location';
import { dragRegionStyles } from './MainPage.styles';
import { MainSidebar } from './MainSidebar';
import type { SettingsSection } from './settings';
import { SettingsContent } from './settings';
import { SettingsSidebar } from './SettingsSidebar';
import {
    AccountModals,
    AddWalletModals,
    ReceiveModals,
    SafetyContent,
    SendModals,
    TransactionDetails,
    UpdatesContent,
    useAccountFlow,
    useAddWalletFlow,
    useReceiveFlow,
    useSendFlow
} from '../../features';
import type { DisclosureProps } from '../../shared';
import { AppLayout } from '../../shared';

export type MainPageProps = {
    location: MainLocation;
    onNavigate: (next: MainLocation) => void;
    hasWindowControls?: boolean;
    isFullScreen?: boolean;
    security: ReactNode;
};

export const MainPage: FC<MainPageProps> = props => {
    const { location, onNavigate, hasWindowControls, isFullScreen, security } = props;
    const { view, modal } = location;

    const hasPortfolio = useHasPortfolio();
    const isWatchOnly = useIsActivePortfolioWatchOnly();
    const modalProps = (kind: MainModal): DisclosureProps => ({
        isOpen: modal === kind,
        onOpen: () => onNavigate({ view, modal: kind }),
        onClose: () => onNavigate({ view, modal: null })
    });
    const addWallet = useAddWalletFlow(modalProps('addWallet'));
    const account = useAccountFlow({ add: modalProps('addAccount') });
    const send = useSendFlow(modalProps('send'));
    const receive = useReceiveFlow(modalProps('receive'));

    const { shouldShowBadge, markWatched } = useBetaFeedWatched();
    const linkState = useAccountLinkState();
    const isAttentionRequired = useIsAttentionRequired();

    const [selectedActivity, setSelectedActivity] = useState<BtcActivityItem | null>(null);

    const section = view.kind === 'settings' ? view.section : null;

    const clearSelectedActivity = useCallback(() => setSelectedActivity(null), []);

    const changeView = (next: MainView): void => {
        onNavigate({ view: next, modal: null });
        setSelectedActivity(null);
    };

    const toggleSettings = (): void =>
        changeView(
            view.kind === 'settings'
                ? { kind: 'home' }
                : { kind: 'settings', section: hasPortfolio ? 'wallet' : 'account' }
        );

    const openHome = (): void => changeView({ kind: 'home' });

    const openUpdates = (): void => {
        changeView({ kind: 'updates' });
        void markWatched();
    };

    const openSafety = (): void => changeView({ kind: 'safety' });

    const selectSection = (next: SettingsSection): void =>
        changeView({ kind: 'settings', section: next });

    /* orders have no detail view on the web targets yet */
    const selectActivity = (activity: ActivityItem): void =>
        isBtcActivityItem(activity) ? setSelectedActivity(activity) : undefined;

    const home = hasPortfolio ? (
        <MainContent
            selectedActivityKey={selectedActivity?.key}
            onSend={send.onOpen}
            onReceive={receive.onOpen}
            onSelectActivity={selectActivity}
            onPortfolioChange={clearSelectedActivity}
        />
    ) : (
        <MainEmptyState onAddWallet={addWallet.open} />
    );

    const safetyNotice = isAttentionRequired
        ? 'attention'
        : linkState === AccountLinkState.SOLO
          ? 'unprotected'
          : undefined;

    const content =
        view.kind === 'updates' ? (
            <UpdatesContent />
        ) : view.kind === 'safety' ? (
            <SafetyContent onAddAccount={account.openAdd} />
        ) : (
            home
        );

    return (
        <AppLayout
            hasWindowControls={hasWindowControls}
            isFullScreen={isFullScreen}
            isSecondaryOpen={view.kind === 'settings'}
            isPanelOpen={selectedActivity !== null}
        >
            <AppLayout.TitleBar className={dragRegionStyles} />

            <MainSidebar
                hasUpdates={shouldShowBadge}
                safetyNotice={safetyNotice}
                isUpdatesOpen={view.kind === 'updates'}
                isSafetyOpen={view.kind === 'safety'}
                isSettingsOpen={view.kind === 'settings'}
                onAddWallet={addWallet.open}
                onSelectWallet={openHome}
                onOpenUpdates={openUpdates}
                onOpenSafety={openSafety}
                onOpenSettings={toggleSettings}
            />

            <SettingsSidebar
                activeSection={section}
                account={account}
                onSelectSection={selectSection}
            />

            <AppLayout.Content>
                {section === null ? (
                    content
                ) : (
                    <SettingsContent section={section} account={account} security={security} />
                )}
            </AppLayout.Content>

            <AppLayout.Panel>
                <AppLayout.PanelContent>
                    {selectedActivity !== null && (
                        <TransactionDetails
                            activity={selectedActivity}
                            onClose={() => setSelectedActivity(null)}
                        />
                    )}
                </AppLayout.PanelContent>
            </AppLayout.Panel>

            <AddWalletModals flow={addWallet} />
            <AccountModals flow={account} />
            {!isWatchOnly && <SendModals flow={send} />}
            <ReceiveModals flow={receive} />
        </AppLayout>
    );
};
