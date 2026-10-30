import type { FC, ReactNode } from 'react';

import { centeredBodyStyles, submitStyles } from './LedgerCard.styles';
import { Button, Modal, StepCard } from '../../shared';

export type LedgerStatusCardProps = {
    hasBackdrop?: boolean;
    media: ReactNode;
    title: string;
    subtitle: string;
    buttonLabel: string;
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
            </div>

            <div className={submitStyles}>
                <Button variant="primary" size="small" onClick={onButtonClick}>
                    {buttonLabel}
                </Button>
            </div>
        </StepCard>
    );
};
