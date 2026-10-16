import type { FC } from 'react';
import { useState } from 'react';

import type { PortfolioMeta, PortfolioMetaIcon } from '@safely/core';
import { useTranslate } from '@safely/ux';

import { fieldStyles, popupStyles } from './CustomizeWalletModal.styles';
import { IconPicker } from './IconPicker';
import { WalletIcon } from './WalletIcon';
import { Button, Input, Modal } from '../../shared';

const NAME_MAX_LENGTH = 24;

export type CustomizeWalletModalProps = {
    defaultName: string;
    defaultIcon: PortfolioMetaIcon;
    onSave: (meta: Pick<PortfolioMeta, 'name' | 'icon'>) => void;
    onClose: () => void;
};

export const CustomizeWalletModal: FC<CustomizeWalletModalProps> = props => {
    const { defaultName, defaultIcon, onSave, onClose } = props;

    const t = useTranslate();
    const [name, setName] = useState(defaultName);
    const [icon, setIcon] = useState<PortfolioMetaIcon>(defaultIcon);

    return (
        <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} hasClose={false} closeLabel={t('common.close')}>
                <Modal.Header closeLabel={t('common.close')}>
                    <Button
                        variant="primary"
                        size="small"
                        disabled={name.trim().length === 0}
                        onClick={() => onSave({ name: name.trim(), icon })}
                    >
                        {t('customizeWallet.save')}
                    </Button>
                </Modal.Header>

                <Modal.Content hasFloatingClose={false}>
                    <Modal.Title>{t('customizeWallet.title')}</Modal.Title>
                    <Modal.Description>{t('customizeWallet.description')}</Modal.Description>
                </Modal.Content>

                <div className={fieldStyles}>
                    <Input>
                        <Input.Field
                            maxLength={NAME_MAX_LENGTH}
                            value={name}
                            placeholder={t('customizeWallet.namePlaceholder')}
                            onChange={event => setName(event.target.value)}
                            trailing={<WalletIcon icon={icon} size="medium" />}
                        />
                    </Input>
                </div>

                <IconPicker icon={icon} onChange={setIcon} />
            </Modal.Popup>
        </Modal>
    );
};
