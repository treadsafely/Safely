import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import { getLedgerImage } from './ledger-image';
import {
    croppedImageStyles,
    imageStyles,
    stepsStyles,
    submitStyles,
    topAlignedBodyStyles
} from './LedgerCard.styles';
import { Button, Modal, StepCard, StepsList } from '../../shared';

export type ConnectLedgerCardProps = {
    hasBackdrop?: boolean;
    onContinue: () => void;
    onBack: () => void;
};

export const ConnectLedgerCard: FC<ConnectLedgerCardProps> = props => {
    const { hasBackdrop = true, onContinue, onBack } = props;

    const t = useTranslate();

    const steps = [
        {
            title: t('addWallet.connectLedger.screen.steps.usb.title'),
            description: t('addWallet.connectLedger.screen.steps.usb.description')
        },
        {
            title: t('addWallet.connectLedger.screen.steps.unlock.title'),
            description: t('addWallet.connectLedger.screen.steps.unlock.descriptionUsb')
        },
        {
            title: t('addWallet.connectLedger.screen.steps.import.title'),
            description: t('addWallet.connectLedger.screen.steps.import.descriptionUsb')
        }
    ];

    return (
        <StepCard hasShadow={hasBackdrop} hasBackdrop={hasBackdrop} onBack={onBack}>
            <div className={topAlignedBodyStyles}>
                <div className={croppedImageStyles}>
                    <img src={getLedgerImage()} className={imageStyles} alt="" />
                </div>

                <Modal.Content hasFloatingClose={false}>
                    <Modal.Title>{t('addWallet.connectLedger.screen.title')}</Modal.Title>
                    <Modal.Description>
                        {t('addWallet.connectLedger.screen.subtitle')}
                    </Modal.Description>
                </Modal.Content>

                <div className={stepsStyles}>
                    <StepsList steps={steps} />
                </div>

                <div className={submitStyles}>
                    <Button variant="primary" size="small" onClick={onContinue}>
                        {t('common.continue')}
                    </Button>
                </div>
            </div>
        </StepCard>
    );
};
