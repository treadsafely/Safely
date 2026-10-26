import type { FC } from 'react';

import type { Contact } from '@safely/core';
import { useTranslate } from '@safely/ux';

import { Button, Modal } from '../../shared';

export type ConfirmDeleteContactModalProps = {
    contact: Contact;
    onConfirm: () => void;
    onClose: () => void;
};

export const ConfirmDeleteContactModal: FC<ConfirmDeleteContactModalProps> = props => {
    const { contact, onConfirm, onClose } = props;

    const t = useTranslate();

    return (
        <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup closeLabel={t('common.close')}>
                <Modal.Content>
                    <Modal.Title>
                        {t('newContact.confirmDelete.title', { name: contact.meta.name })}
                    </Modal.Title>
                    <Modal.Description>{t('newContact.confirmDelete.message')}</Modal.Description>
                </Modal.Content>

                <Modal.Actions>
                    <Button variant="destructive" isFullWidth onClick={onConfirm}>
                        {t('common.remove')}
                    </Button>
                    <Button variant="secondary" isFullWidth onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                </Modal.Actions>
            </Modal.Popup>
        </Modal>
    );
};
