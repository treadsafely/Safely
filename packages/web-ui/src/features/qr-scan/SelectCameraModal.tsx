import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import { actionsStyles, listStyles } from './SelectCameraModal.styles';
import { Button, Cell, List, Modal } from '../../shared';

export type CameraOption = {
    deviceId: string;
    label: string;
};

export type SelectCameraModalProps = {
    options: readonly CameraOption[];
    /* `null` is the automatic choice: whichever camera the platform hands out */
    selectedDeviceId: string | null;
    onSelect: (deviceId: string | null) => void;
    onClose: () => void;
};

export const SelectCameraModal: FC<SelectCameraModalProps> = props => {
    const { options, selectedDeviceId, onSelect, onClose } = props;

    const t = useTranslate();

    return (
        <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup closeLabel={t('common.close')} hasClose={false}>
                <Modal.Header
                    closeLabel={t('common.close')}
                    title={t('qrScan.source.title')}
                    align="start"
                />

                <List className={listStyles}>
                    <List.Group>
                        <Cell onClick={() => onSelect(null)}>
                            <Cell.Content>
                                <Cell.Row>
                                    <Cell.Title>{t('qrScan.source.automatic')}</Cell.Title>
                                </Cell.Row>
                            </Cell.Content>
                            {selectedDeviceId === null && <Cell.Checkmark />}
                        </Cell>

                        {options.map(option => (
                            <Cell key={option.deviceId} onClick={() => onSelect(option.deviceId)}>
                                <Cell.Content>
                                    <Cell.Row>
                                        <Cell.Title>{option.label}</Cell.Title>
                                    </Cell.Row>
                                </Cell.Content>
                                {selectedDeviceId === option.deviceId && <Cell.Checkmark />}
                            </Cell>
                        ))}
                    </List.Group>
                </List>

                <div className={actionsStyles}>
                    <Button variant="secondary" isFullWidth onClick={onClose}>
                        {t('common.ok')}
                    </Button>
                </div>
            </Modal.Popup>
        </Modal>
    );
};
