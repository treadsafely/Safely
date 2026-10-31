import type { FC } from 'react';

import { getLedgerModelName, useLedgerSession, useTranslate } from '@safely/ux';
import Checkmark96 from '@safely/ux/assets/icons/96/checkmark-96.svg?react';
import ExclamationmarkCircle96 from '@safely/ux/assets/icons/96/exclamationmark-circle-96.svg?react';

import { ConnectLedgerCard } from './ConnectLedgerCard';
import { LedgerDiscoveryCard } from './LedgerDiscoveryCard';
import { LedgerImportAccounts } from './LedgerImportAccounts';
import { LedgerPairingCard } from './LedgerPairingCard';
import { LedgerStatusCard } from './LedgerStatusCard';
import type { useLedgerFlow } from './useLedgerFlow';
import { CustomizeWalletModal } from '../../entities';
import { Icon } from '../../shared';

export type LedgerModalsProps = {
    flow: ReturnType<typeof useLedgerFlow>;
    hasBackdrop?: boolean;
};

export const LedgerModals: FC<LedgerModalsProps> = ({ flow, hasBackdrop = true }) => {
    const t = useTranslate();
    const { selectedDevice, findMorePortfolioId } = useLedgerSession();
    const device = getLedgerModelName(selectedDevice?.deviceModel.model);

    switch (flow.step) {
        case 'connect':
            return (
                <ConnectLedgerCard
                    hasBackdrop={hasBackdrop}
                    onContinue={() => void flow.continueFromConnect()}
                    onBack={flow.exit}
                />
            );
        case 'discovery':
            return (
                <LedgerDiscoveryCard
                    hasBackdrop={hasBackdrop}
                    onDeviceFound={flow.onDeviceFound}
                    onError={flow.onDiscoveryError}
                    onBack={flow.backToConnect}
                />
            );
        case 'pairing':
            return (
                <LedgerPairingCard
                    hasBackdrop={hasBackdrop}
                    onConnected={flow.onPaired}
                    onFailed={flow.onPairingFailed}
                    onBack={flow.backToConnect}
                />
            );
        case 'pairingSuccess':
            return (
                <LedgerStatusCard
                    hasBackdrop={hasBackdrop}
                    media={<Icon asset={Checkmark96} size={96} tone="accentGreen" />}
                    title={t('addWallet.connectLedger.pairingSuccess.title')}
                    subtitle={t('addWallet.connectLedger.pairingSuccess.subtitle', { device })}
                    buttonLabel={t('common.continue')}
                    onButtonClick={flow.continueToImport}
                    onBack={flow.backToConnect}
                />
            );
        case 'pairingUnsuccess':
            return (
                <LedgerStatusCard
                    hasBackdrop={hasBackdrop}
                    media={<Icon asset={ExclamationmarkCircle96} size={96} tone="accentOrange" />}
                    title={t('addWallet.connectLedger.pairingUnsuccess.title')}
                    subtitle={
                        flow.isAppNotInstalled
                            ? t('addWallet.connectLedger.pairingUnsuccess.appNotInstalled', {
                                  device
                              })
                            : t('addWallet.connectLedger.pairingUnsuccess.subtitleUsb', { device })
                    }
                    buttonLabel={t('addWallet.connectLedger.pairingUnsuccess.retry')}
                    onButtonClick={() => void flow.retryPairing()}
                    onBack={flow.backToConnect}
                />
            );
        case 'import':
            return (
                <LedgerImportAccounts
                    hasBackdrop={hasBackdrop}
                    portfolios={flow.portfolios}
                    findMorePortfolioId={findMorePortfolioId}
                    onContinue={flow.selectAccounts}
                    onRetry={flow.onImportRetry}
                    onBack={flow.backToConnect}
                />
            );
        case 'customize':
            return (
                flow.draft && (
                    <CustomizeWalletModal
                        title={t('customizeWallet.ledgerTitle')}
                        defaultName={flow.draft.name}
                        defaultIcon={flow.draft.icon}
                        onSave={meta => void flow.save(meta)}
                        onClose={flow.backFromCustomize}
                    />
                )
            );
        default:
            return flow.step satisfies never;
    }
};
