import type { FC } from 'react';

import { useTranslate } from '@safely/ux';
import CameraLock96 from '@safely/ux/assets/icons/96/camera-lock-96.svg?react';

import {
    actionsStyles,
    contentStyles,
    iconStyles,
    popupStyles,
    textStyles
} from './CameraAccessModal.styles';
import { Button, Icon, Modal } from '../../shared';

export type CameraAccessModalProps = {
    onOpenSettings: () => void;
    onClose: () => void;
};

export const CameraAccessModal: FC<CameraAccessModalProps> = props => {
    const { onOpenSettings, onClose } = props;

    const t = useTranslate();

    return (
        <Modal open onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')} hasTransparentClose>
                <div className={contentStyles}>
                    <div className={iconStyles}>
                        <Icon asset={CameraLock96} size={96} />
                    </div>

                    <div className={textStyles}>
                        <Modal.Title>{t('camera.permissionRequest.title')}</Modal.Title>
                        <Modal.Description>
                            {t('camera.permissionRequest.web.description')}
                        </Modal.Description>
                    </div>

                    <div className={actionsStyles}>
                        <Button size="small" onClick={onOpenSettings}>
                            {t('camera.permissionRequest.web.button')}
                        </Button>
                    </div>
                </div>
            </Modal.Popup>
        </Modal>
    );
};
