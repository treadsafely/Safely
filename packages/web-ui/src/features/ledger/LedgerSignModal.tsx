import type { FC } from 'react';

import type { LedgerSigningActor } from '@safely/ux';
import { useLedgerSigning, useLedgerSigningSteps, useTranslate } from '@safely/ux';

import { getLedgerImage, LEDGER_BTC_APP_LOGO } from './ledger-image';
import { imageStyles } from './LedgerCard.styles';
import {
    actionsStyles,
    appLogoStyles,
    headerStyles,
    popupStyles,
    stepsStyles
} from './LedgerSignModal.styles';
import { LedgerSteps } from './LedgerSteps';
import { Button, Modal } from '../../shared';

export const LedgerSignModal: FC = () => {
    const { activeActor } = useLedgerSigning();

    return activeActor === null ? null : (
        <LedgerSignDialog key={activeActor.sessionId} actor={activeActor} />
    );
};

type LedgerSignDialogProps = {
    actor: LedgerSigningActor;
};

const LedgerSignDialog: FC<LedgerSignDialogProps> = ({ actor }) => {
    const t = useTranslate();
    const { steps, deviceModel, isFailed, isUnsupportedApp } = useLedgerSigningSteps(actor);

    const cancel = (): void => actor.send({ type: 'CANCEL' });

    return (
        <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && cancel()}>
            <Modal.Popup className={popupStyles} hasClose={false} closeLabel={t('common.close')}>
                {isUnsupportedApp ? (
                    <>
                        <div className={headerStyles}>
                            <img src={LEDGER_BTC_APP_LOGO} className={appLogoStyles} alt="" />

                            <Modal.Content hasFloatingClose={false}>
                                <Modal.Title>{t('ledgerSign.updateApp.title')}</Modal.Title>
                                <Modal.Description>
                                    {t('ledgerSign.updateApp.subtitle')}
                                </Modal.Description>
                            </Modal.Content>
                        </div>

                        <Modal.Actions className={actionsStyles}>
                            <Button variant="primary" isFullWidth onClick={cancel}>
                                {t('ledgerSign.updateApp.gotIt')}
                            </Button>
                        </Modal.Actions>
                    </>
                ) : (
                    <>
                        <div className={headerStyles}>
                            <img src={getLedgerImage(deviceModel)} className={imageStyles} alt="" />

                            <Modal.Content hasFloatingClose={false}>
                                <Modal.Title>{t('ledgerSign.title')}</Modal.Title>
                                <Modal.Description>{t('ledgerSign.subtitle')}</Modal.Description>
                            </Modal.Content>
                        </div>

                        <div className={stepsStyles}>
                            <LedgerSteps steps={steps} />
                        </div>

                        <Modal.Actions direction="row" className={actionsStyles}>
                            <Button variant="secondary" isFullWidth onClick={cancel}>
                                {t('ledgerSign.cancel')}
                            </Button>
                            {isFailed && (
                                <Button
                                    variant="primary"
                                    isFullWidth
                                    onClick={() => actor.send({ type: 'RETRY' })}
                                >
                                    {t('ledgerSign.retry')}
                                </Button>
                            )}
                        </Modal.Actions>
                    </>
                )}
            </Modal.Popup>
        </Modal>
    );
};
