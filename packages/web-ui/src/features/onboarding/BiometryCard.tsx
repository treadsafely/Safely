import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import { actionStyles, iconStyles, skipStyles, textStyles } from './BiometryCard.styles';
import type { BiometryScreenProps } from '../../shared';
import { Button, Icon, Modal, StepCard } from '../../shared';

const ICON_SIZE = 96;

export const BiometryCard: FC<BiometryScreenProps> = props => {
    const { icon, title, description, enableLabel, onEnable, onSkip } = props;

    const t = useTranslate();

    return (
        <StepCard
            hasShadow={false}
            hasBackdrop={false}
            trailing={
                <Button variant="secondary" size="xsmall" className={skipStyles} onClick={onSkip}>
                    {t('common.later')}
                </Button>
            }
        >
            <div className={iconStyles}>
                <Icon asset={icon} size={ICON_SIZE} />
            </div>

            <Modal.Content hasFloatingClose={false}>
                <div className={textStyles}>
                    <Modal.Title>{title}</Modal.Title>
                    <Modal.Description>{description}</Modal.Description>
                </div>
            </Modal.Content>

            <div className={actionStyles}>
                <Button size="small" onClick={onEnable}>
                    {enableLabel}
                </Button>
            </div>
        </StepCard>
    );
};
