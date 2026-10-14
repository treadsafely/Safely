import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import {
    compactActionStyles,
    compactIconStyles,
    contentStyles,
    popupStyles,
    skipStyles,
    textStyles
} from './BiometryPage.styles';
import type { IconAsset } from '../../shared';
import { Button, Icon, Modal, OnboardingCard } from '../../shared';

export type BiometryPageProps = {
    icon: IconAsset;
    title: string;
    description: string;
    enableLabel: string;
    appearance?: 'modal' | 'onboarding';
    onEnable: () => void;
    onSkip: () => void;
};

const ICON_SIZE = 96;

export const BiometryPage: FC<BiometryPageProps> = props => {
    const { icon, title, description, enableLabel, appearance = 'modal', onEnable, onSkip } = props;

    const t = useTranslate();

    const text = (
        <div className={textStyles}>
            <Modal.Title>{title}</Modal.Title>
            <Modal.Description>{description}</Modal.Description>
        </div>
    );

    if (appearance === 'onboarding') {
        return (
            <OnboardingCard
                hasShadow={false}
                trailing={
                    <Button
                        variant="secondary"
                        size="xsmall"
                        className={skipStyles}
                        onClick={onSkip}
                    >
                        {t('common.later')}
                    </Button>
                }
            >
                <div className={compactIconStyles}>
                    <Icon asset={icon} size={ICON_SIZE} />
                </div>

                <Modal.Content hasFloatingClose={false}>{text}</Modal.Content>

                <div className={compactActionStyles}>
                    <Button size="small" onClick={onEnable}>
                        {enableLabel}
                    </Button>
                </div>
            </OnboardingCard>
        );
    }

    return (
        <Modal open onOpenChange={isOpen => !isOpen && onSkip()}>
            <Modal.Popup className={popupStyles} hasClose={false} closeLabel={t('common.close')}>
                <Modal.Header closeLabel={t('common.close')}>
                    <Button variant="secondary" size="xsmall" onClick={onSkip}>
                        {t('common.later')}
                    </Button>
                </Modal.Header>

                <Modal.Content className={contentStyles} hasFloatingClose={false}>
                    <Icon asset={icon} size={ICON_SIZE} />

                    {text}
                </Modal.Content>

                <Modal.Actions>
                    <Button isFullWidth onClick={onEnable}>
                        {enableLabel}
                    </Button>
                </Modal.Actions>
            </Modal.Popup>
        </Modal>
    );
};
