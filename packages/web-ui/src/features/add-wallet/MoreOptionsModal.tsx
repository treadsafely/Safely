import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import { popupStyles } from './MoreOptionsModal.styles';
import { Button, Modal } from '../../shared';

export type MoreOptionsModalProps = {
    onWatchAccount: () => void;
    onConnectLedger: () => void;
    onClose: () => void;
};

export const MoreOptionsModal: FC<MoreOptionsModalProps> = props => {
    const { onWatchAccount, onConnectLedger, onClose } = props;

    const t = useTranslate();

    return (
        <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')}>
                <Modal.Content>
                    <Modal.Title>{t('moreOptions.title')}</Modal.Title>
                    <Modal.Description>{t('moreOptions.subtitle')}</Modal.Description>
                </Modal.Content>

                <Modal.Actions>
                    <Button variant="secondary" isFullWidth onClick={onConnectLedger}>
                        {t('moreOptions.connectLedger')}
                    </Button>
                    <Button variant="secondary" isFullWidth onClick={onWatchAccount}>
                        {t('moreOptions.watchAccount')}
                    </Button>
                </Modal.Actions>
            </Modal.Popup>
        </Modal>
    );
};
