import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import { Button, Modal } from '../../shared';

export type EraseDataModalProps = {
    onConfirm: () => void;
    onClose: () => void;
};

export const EraseDataModal: FC<EraseDataModalProps> = props => {
    const { onConfirm, onClose } = props;

    const t = useTranslate();

    return (
        <Modal open onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup closeLabel={t('common.close')}>
                <Modal.Content>
                    <Modal.Title>{t('logOutAllAccounts.title')}</Modal.Title>
                    <Modal.Description>{t('logOutAllAccounts.message')}</Modal.Description>
                </Modal.Content>

                <Modal.Actions>
                    <Button variant="destructive" isFullWidth onClick={onConfirm}>
                        {t('logOutAllAccounts.slider.label')}
                    </Button>
                    <Button variant="secondary" isFullWidth onClick={onClose}>
                        {t('logOutAllAccounts.cancel')}
                    </Button>
                </Modal.Actions>
            </Modal.Popup>
        </Modal>
    );
};
