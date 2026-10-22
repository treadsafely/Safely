import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import { contentStyles, qrStyles } from './SignInCard.styles';
import { Modal, StepCard } from '../../shared';
import { SignInContent } from '../sync';

export type SignInCardProps = {
    connectionString: string;
    onBack: () => void;
};

export const SignInCard: FC<SignInCardProps> = props => {
    const { connectionString, onBack } = props;

    const t = useTranslate();

    return (
        <StepCard hasShadow={false} hasBackdrop={false} onBack={onBack}>
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
        </StepCard>
    );
};
