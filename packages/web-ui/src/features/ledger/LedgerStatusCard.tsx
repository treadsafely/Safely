import type { FC, ReactNode } from 'react';

import { centeredBodyStyles } from './LedgerCard.styles';
import type { ButtonProps } from '../../shared';
import { Button, Modal, StepCard } from '../../shared';

export type LedgerStatusCardProps = {
    hasBackdrop?: boolean;
    media: ReactNode;
    title: string;
    subtitle: string;
    buttonLabel: string;
    buttonVariant?: ButtonProps['variant'];
    onButtonClick: () => void;
    onBack: () => void;
};

export const LedgerStatusCard: FC<LedgerStatusCardProps> = props => {
    const {
        hasBackdrop = true,
        media,
        title,
        subtitle,
        buttonLabel,
        buttonVariant = 'primary',
        onButtonClick,
        onBack
    } = props;

    return (
        <StepCard hasShadow={hasBackdrop} hasBackdrop={hasBackdrop} onBack={onBack}>
            <div className={centeredBodyStyles}>
                {media}

                <Modal.Content hasFloatingClose={false}>
                    <Modal.Title>{title}</Modal.Title>
                    <Modal.Description>{subtitle}</Modal.Description>
                </Modal.Content>

                <Button variant={buttonVariant} size="small" onClick={onButtonClick}>
                    {buttonLabel}
                </Button>
            </div>
        </StepCard>
    );
};
