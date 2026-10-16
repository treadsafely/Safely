import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import { contentStyles, popupStyles, textStyles } from './BiometryPage.styles';
import type { BiometryScreenProps } from '../../shared';
import { Button, Icon, Modal } from '../../shared';

const ICON_SIZE = 96;

export const BiometryPage: FC<BiometryScreenProps> = props => {
    const { icon, title, description, enableLabel, onEnable, onSkip } = props;

    const t = useTranslate();

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

                    <div className={textStyles}>
                        <Modal.Title>{title}</Modal.Title>
                        <Modal.Description>{description}</Modal.Description>
                    </div>
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
