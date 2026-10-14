import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import { SignInSuccessContent } from './SignInSuccessContent';
import { popupStyles } from './SignInSuccessModal.styles';
import { Button, Modal } from '../../shared';

export type SignInSuccessModalProps = {
    inviterIkPubHex: string | null;
    onContinue: () => void;
};

export const SignInSuccessModal: FC<SignInSuccessModalProps> = props => {
    const { inviterIkPubHex, onContinue } = props;

    const t = useTranslate();

    return (
        <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onContinue()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')}>
                <SignInSuccessContent inviterIkPubHex={inviterIkPubHex} />

                <Modal.Actions>
                    <Button variant="secondary" isFullWidth onClick={onContinue}>
                        {t('signIn.success.continue')}
                    </Button>
                </Modal.Actions>
            </Modal.Popup>
        </Modal>
    );
};
