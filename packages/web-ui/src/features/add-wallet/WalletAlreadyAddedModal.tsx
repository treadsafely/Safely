import type { FC } from 'react';

import type { PortfolioMeta } from '@safely/core';
import { getPortfolioDisplayName, useTranslate } from '@safely/ux';

import { iconStyles, popupStyles } from './WalletAlreadyAddedModal.styles';
import { WalletIcon } from '../../entities';
import { Button, Modal } from '../../shared';

export type WalletAlreadyAddedModalProps = {
    meta: PortfolioMeta;
    onOpen: () => void;
    onEdit: () => void;
    onClose: () => void;
};

export const WalletAlreadyAddedModal: FC<WalletAlreadyAddedModalProps> = props => {
    const { meta, onOpen, onEdit, onClose } = props;

    const t = useTranslate();

    return (
        <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')}>
                <div className={iconStyles}>
                    <WalletIcon icon={meta.icon} size="large" />
                </div>

                <Modal.Content hasFloatingClose={false}>
                    <Modal.Title>
                        {t('walletAlreadyAdded.title', { name: getPortfolioDisplayName(meta) })}
                    </Modal.Title>
                    <Modal.Description>{t('walletAlreadyAdded.subtitle')}</Modal.Description>
                </Modal.Content>

                <Modal.Actions>
                    <Button variant="primary" isFullWidth onClick={onOpen}>
                        {t('walletAlreadyAdded.open')}
                    </Button>
                    <Button variant="secondary" isFullWidth onClick={onEdit}>
                        {t('walletAlreadyAdded.edit')}
                    </Button>
                </Modal.Actions>
            </Modal.Popup>
        </Modal>
    );
};
