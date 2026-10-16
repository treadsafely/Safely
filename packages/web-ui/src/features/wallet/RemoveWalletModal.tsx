import type { FC } from 'react';
import { useState } from 'react';

import type { Portfolio } from '@safely/core';
import { PortfolioType } from '@safely/core';
import { resolveRemoveWalletCopy, useTranslate } from '@safely/ux';

import {
    confirmStyles,
    confirmTextStyles,
    linkStyles,
    popupStyles
} from './RemoveWalletModal.styles';
import { Button, Checkbox, Modal, Text } from '../../shared';

export type RemoveWalletModalProps = {
    portfolio: Portfolio;
    onRemove: () => void;
    onBackUp: () => void;
    onClose: () => void;
};

export const RemoveWalletModal: FC<RemoveWalletModalProps> = props => {
    const { portfolio, onRemove, onBackUp, onClose } = props;

    const t = useTranslate();
    const copy = resolveRemoveWalletCopy(portfolio);
    const [isConfirmed, setIsConfirmed] = useState(false);

    const derivationsCount =
        portfolio.type === PortfolioType.LEDGER ? portfolio.getDerivations().length : 0;

    return (
        <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')}>
                <Modal.Content>
                    <Modal.Title>{t(copy.titleKey, { name: portfolio.meta.name })}</Modal.Title>
                    <Modal.Description>
                        {t(copy.subtitleKey, { count: derivationsCount })}{' '}
                        {copy.hasBackUpLink && (
                            <button type="button" className={linkStyles} onClick={onBackUp}>
                                {t('removeWallet.backUpLink')}
                            </button>
                        )}
                    </Modal.Description>
                </Modal.Content>

                {copy.checkboxKey !== undefined && (
                    <label className={confirmStyles}>
                        <Text variant="bodyM" className={confirmTextStyles}>
                            {t(copy.checkboxKey)}
                        </Text>
                        <Checkbox checked={isConfirmed} onCheckedChange={setIsConfirmed} />
                    </label>
                )}

                <Modal.Actions>
                    <Button
                        variant="destructive"
                        isFullWidth
                        disabled={copy.checkboxKey !== undefined && !isConfirmed}
                        onClick={onRemove}
                    >
                        {t(copy.buttonKey)}
                    </Button>
                    <Button variant="secondary" isFullWidth onClick={onClose}>
                        {t('removeWallet.cancelButton')}
                    </Button>
                </Modal.Actions>
            </Modal.Popup>
        </Modal>
    );
};
