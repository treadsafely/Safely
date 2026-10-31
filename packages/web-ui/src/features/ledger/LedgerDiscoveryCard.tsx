import type { FC } from 'react';

import { useLedgerDiscovery, useTranslate } from '@safely/ux';
import LedgerLogo96 from '@safely/ux/assets/icons/96/ledger-logo-96.svg?react';

import { centeredBodyStyles, pulseStyles, ringStyles } from './LedgerCard.styles';
import { Icon, Modal, StepCard } from '../../shared';

export type LedgerDiscoveryCardProps = {
    hasBackdrop?: boolean;
    onDeviceFound: () => void;
    onError: () => void;
    onBack: () => void;
};

export const LedgerDiscoveryCard: FC<LedgerDiscoveryCardProps> = props => {
    const { hasBackdrop = true, onDeviceFound, onError, onBack } = props;

    const t = useTranslate();
    useLedgerDiscovery({ onDeviceFound, onError });

    return (
        <StepCard hasShadow={hasBackdrop} hasBackdrop={hasBackdrop} onBack={onBack}>
            <div className={centeredBodyStyles}>
                <div className={pulseStyles}>
                    <span className={ringStyles} />
                    <Icon asset={LedgerLogo96} size={96} />
                </div>

                <Modal.Content hasFloatingClose={false}>
                    <Modal.Title>{t('addWallet.connectLedger.discovery.title')}</Modal.Title>
                    <Modal.Description>
                        {t('addWallet.connectLedger.discovery.subtitleUsb')}
                    </Modal.Description>
                </Modal.Content>
            </div>
        </StepCard>
    );
};
