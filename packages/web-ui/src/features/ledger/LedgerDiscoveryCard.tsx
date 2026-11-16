import type { FC } from 'react';

import { useLedgerDiscovery, useTranslate } from '@safely/ux';
import Usb96 from '@safely/ux/assets/icons/96/usb-96.svg?react';

import { centeredBodyStyles } from './LedgerCard.styles';
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
                <Icon asset={Usb96} size={96} />

                <Modal.Content hasFloatingClose={false}>
                    <Modal.Title>{t('addWallet.connectLedger.discovery.titleUsb')}</Modal.Title>
                    <Modal.Description>
                        {t('addWallet.connectLedger.discovery.subtitleUsb')}
                    </Modal.Description>
                </Modal.Content>
            </div>
        </StepCard>
    );
};
