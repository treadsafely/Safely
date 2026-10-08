import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import { popupStyles } from './AddAccountModal.styles';
import { Button, Modal } from '../../shared';

export type AddAccountModalProps = {
    onCreateNew: () => void;
    onSignIn: () => void;
    onClose: () => void;
};

export const AddAccountModal: FC<AddAccountModalProps> = props => {
    const { onCreateNew, onSignIn, onClose } = props;

    const t = useTranslate();

    return (
        <Modal open onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')}>
                <Modal.Content>
                    <Modal.Title>{t('addAccount.title')}</Modal.Title>
                    <Modal.Description>{t('addAccount.subtitle')}</Modal.Description>
                </Modal.Content>

                <Modal.Actions>
                    <Button variant="primary" isFullWidth onClick={onCreateNew}>
                        {t('addAccount.createNew')}
                    </Button>
                    <Button variant="secondary" isFullWidth onClick={onSignIn}>
                        {t('addAccount.signIn')}
                    </Button>
                </Modal.Actions>
            </Modal.Popup>
        </Modal>
    );
};
