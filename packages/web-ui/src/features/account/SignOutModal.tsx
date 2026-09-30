import type { FC } from 'react';
import { useState } from 'react';

import { resolveSignOutCopy, useHasActivePeer, useTranslate } from '@safely/ux';

import { acknowledgementStyles } from './SignOutModal.styles';
import { Button, Checkbox, Modal, Text } from '../../shared';

export type SignOutModalProps = {
    accountName: string;
    onConfirm: () => void;
    onClose: () => void;
};

export const SignOutModal: FC<SignOutModalProps> = props => {
    const { accountName, onConfirm, onClose } = props;

    const t = useTranslate();
    const hasActivePeer = useHasActivePeer();
    const [copy] = useState(() => resolveSignOutCopy(hasActivePeer));
    const [isAcknowledged, setIsAcknowledged] = useState(false);

    return (
        <Modal open onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup closeLabel={t('common.close')}>
                <Modal.Content>
                    <Modal.Title>
                        {t('settings.signOutAccount.sheet.title', { name: accountName })}
                    </Modal.Title>
                    <Modal.Description>{t(copy.subtitleKey)}</Modal.Description>
                </Modal.Content>

                {copy.checkboxKey !== undefined && (
                    <label className={acknowledgementStyles}>
                        <Text variant="bodyM">{t(copy.checkboxKey)}</Text>
                        <Checkbox checked={isAcknowledged} onCheckedChange={setIsAcknowledged} />
                    </label>
                )}

                <Modal.Actions>
                    <Button
                        variant="destructive"
                        isFullWidth
                        disabled={copy.checkboxKey !== undefined && !isAcknowledged}
                        onClick={onConfirm}
                    >
                        {t('settings.signOutAccount.sheet.signOutButton')}
                    </Button>
                    <Button variant="secondary" isFullWidth onClick={onClose}>
                        {t('settings.signOutAccount.sheet.cancelButton')}
                    </Button>
                </Modal.Actions>
            </Modal.Popup>
        </Modal>
    );
};
