import type { FC } from 'react';
import { useState } from 'react';

import { useTranslate } from '@safely/ux';

import { fieldStyles, popupStyles } from './CustomizeAccountModal.styles';
import { Button, Input, Modal } from '../../shared';

const NAME_MAX_LENGTH = 24;

export type CustomizeAccountModalProps = {
    defaultName: string;
    onSave: (name: string) => void;
    onClose: () => void;
};

export const CustomizeAccountModal: FC<CustomizeAccountModalProps> = props => {
    const { defaultName, onSave, onClose } = props;

    const t = useTranslate();
    const [name, setName] = useState(defaultName);

    const trimmedName = name.trim();

    return (
        <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} hasClose={false} closeLabel={t('common.close')}>
                <Modal.Header closeLabel={t('common.close')}>
                    <Button
                        variant="primary"
                        size="small"
                        disabled={trimmedName.length === 0}
                        onClick={() => onSave(trimmedName)}
                    >
                        {t('customizeAccount.save')}
                    </Button>
                </Modal.Header>

                <Modal.Content hasFloatingClose={false}>
                    <Modal.Title>{t('customizeAccount.title')}</Modal.Title>
                    <Modal.Description>{t('customizeAccount.subtitle')}</Modal.Description>
                </Modal.Content>

                <div className={fieldStyles}>
                    <Input>
                        <Input.Field
                            autoFocus
                            maxLength={NAME_MAX_LENGTH}
                            value={name}
                            placeholder={t('customizeAccount.namePlaceholder')}
                            onChange={event => setName(event.target.value)}
                            onKeyDown={event =>
                                trimmedName.length > 0 &&
                                event.key === 'Enter' &&
                                onSave(trimmedName)
                            }
                        />
                    </Input>
                </div>
            </Modal.Popup>
        </Modal>
    );
};
