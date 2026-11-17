import type { FC } from 'react';

import { useLedgerPairingSteps, useLedgerSession, useTranslate } from '@safely/ux';

import { getLedgerImage } from './ledger-image';
import { bodyStyles, compactImageStyles, imageStyles, stepsStyles } from './LedgerCard.styles';
import { LedgerSteps } from './LedgerSteps';
import { Modal, StepCard } from '../../shared';

export type LedgerPairingCardProps = {
    hasBackdrop?: boolean;
    onConnected: () => void;
    onFailed: (isAppNotInstalled: boolean) => void;
    onBack: () => void;
};

export const LedgerPairingCard: FC<LedgerPairingCardProps> = props => {
    const { hasBackdrop = true, onConnected, onFailed, onBack } = props;

    const t = useTranslate();
    const { selectedDevice } = useLedgerSession();
    const { steps, title } = useLedgerPairingSteps({ onConnected, onFailed });

    return (
        <StepCard hasShadow={hasBackdrop} hasBackdrop={hasBackdrop} onBack={onBack}>
            <div className={bodyStyles}>
                <div className={compactImageStyles}>
                    <img
                        src={getLedgerImage(selectedDevice?.deviceModel.model)}
                        className={imageStyles}
                        alt=""
                    />
                </div>

                <Modal.Content hasFloatingClose={false}>
                    <Modal.Title>{title}</Modal.Title>
                    <Modal.Description>
                        {t('addWallet.connectLedger.pairing.subtitle')}
                    </Modal.Description>
                </Modal.Content>

                <div className={stepsStyles}>
                    <LedgerSteps steps={steps} />
                </div>
            </div>
        </StepCard>
    );
};
