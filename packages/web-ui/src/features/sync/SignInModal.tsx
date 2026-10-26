import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import { SignInContent } from './SignInContent';
import { contentStyles, popupStyles, qrStyles } from './SignInModal.styles';
import { Modal } from '../../shared';

export type SignInModalProps = {
    connectionString: string;
    onClose: () => void;
};

export const SignInModal: FC<SignInModalProps> = props => {
    const { connectionString, onClose } = props;

    const t = useTranslate();

    return (
        <Modal open onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')}>
                <SignInContent
                    connectionString={connectionString}
                    className={qrStyles}
                    heading={
                        <Modal.Content className={contentStyles}>
                            <Modal.Title>{t('signIn.title')}</Modal.Title>
                            <Modal.Description>{t('signIn.description')}</Modal.Description>
                        </Modal.Content>
                    }
                />
            </Modal.Popup>
        </Modal>
    );
};
