import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import { Button, Modal, StepCard } from '../../shared';
import { SignInSuccessContent } from '../sync';

export type SignInSuccessCardProps = {
    inviterIkPubHex: string | null;
    onContinue: () => void;
};

export const SignInSuccessCard: FC<SignInSuccessCardProps> = props => {
    const { inviterIkPubHex, onContinue } = props;

    const t = useTranslate();

    return (
        <StepCard hasShadow={false} hasBackdrop={false}>
            <SignInSuccessContent inviterIkPubHex={inviterIkPubHex} />

            <Modal.Actions>
                <Button variant="secondary" isFullWidth onClick={onContinue}>
                    {t('signIn.success.continue')}
                </Button>
            </Modal.Actions>
        </StepCard>
    );
};
