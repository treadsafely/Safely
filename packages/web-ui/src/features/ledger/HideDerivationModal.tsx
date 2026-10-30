import type { FC } from 'react';

import type { ILedgerDerivation } from '@safely/core';
import { useTranslate } from '@safely/ux';

import { Button, Modal } from '../../shared';

export type HideDerivationModalProps = {
    derivation: ILedgerDerivation;
    onHide: () => void;
    onClose: () => void;
};

export const HideDerivationModal: FC<HideDerivationModalProps> = props => {
    const { derivation, onHide, onClose } = props;

    const t = useTranslate();

    return (
        <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup closeLabel={t('common.close')}>
                <Modal.Content>
                    <Modal.Title>
                        {t('removeWallet.hideDerivation.title', { name: derivation.meta.name })}
                    </Modal.Title>
                    <Modal.Description>
                        {t('removeWallet.hideDerivation.subtitle')}
                    </Modal.Description>
                </Modal.Content>

                <Modal.Actions>
                    <Button variant="destructive" isFullWidth onClick={onHide}>
                        {t('removeWallet.hideDerivation.button')}
                    </Button>
                    <Button variant="secondary" isFullWidth onClick={onClose}>
                        {t('removeWallet.cancelButton')}
                    </Button>
                </Modal.Actions>
            </Modal.Popup>
        </Modal>
    );
};
