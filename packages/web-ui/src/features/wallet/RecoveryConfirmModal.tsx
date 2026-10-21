import type { FC } from 'react';

import { useTranslate } from '@safely/ux';
import ListKey96 from '@safely/ux/assets/icons/96/list-key-96.svg?react';

import {
    actionsStyles,
    actionStyles,
    bulletStyles,
    iconStyles,
    popupStyles,
    warningsStyles,
    warningStyles
} from './RecoveryConfirmModal.styles';
import { Button, Icon, Modal, Text } from '../../shared';

export type RecoveryConfirmModalProps = {
    onReveal: () => void;
    onClose: () => void;
};

export const RecoveryConfirmModal: FC<RecoveryConfirmModalProps> = ({ onReveal, onClose }) => {
    const t = useTranslate();

    return (
        <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')}>
                <div className={iconStyles}>
                    <Icon asset={ListKey96} size={96} />
                </div>

                <Modal.Content hasFloatingClose={false}>
                    <Modal.Title>{t('security.recoverySheet.title')}</Modal.Title>
                    <Modal.Description>{t('security.recoverySheet.description')}</Modal.Description>
                </Modal.Content>

                <div className={warningsStyles}>
                    <div className={warningStyles}>
                        <span className={bulletStyles} />
                        <Text variant="bodyM">{t('security.recoverySheet.warning1')}</Text>
                    </div>
                    <div className={warningStyles}>
                        <span className={bulletStyles} />
                        <Text variant="bodyM">{t('security.recoverySheet.warning2')}</Text>
                    </div>
                </div>

                <Modal.Actions className={actionsStyles}>
                    <Button variant="secondary" className={actionStyles} onClick={onClose}>
                        {t('security.recoverySheet.cancel')}
                    </Button>
                    <Button variant="primary" className={actionStyles} onClick={onReveal}>
                        {t('security.recoverySheet.reveal')}
                    </Button>
                </Modal.Actions>
            </Modal.Popup>
        </Modal>
    );
};
