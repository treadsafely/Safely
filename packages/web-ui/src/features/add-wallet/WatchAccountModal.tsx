import type { FC } from 'react';
import { useState } from 'react';

import { BtcAddress, BtcXpub } from '@safely/core';
import { useTranslate } from '@safely/ux';

import {
    bannerStyles,
    bodyStyles,
    errorStyles,
    fieldStyles,
    popupStyles
} from './WatchAccountModal.styles';
import { Banner, Button, Input, Modal, Text } from '../../shared';

export type WatchAccountModalProps = {
    onSubmit: (input: string) => void;
    onClose: () => void;
};

const ERROR_VISIBLE_LENGTH = 20;

export const WatchAccountModal: FC<WatchAccountModalProps> = ({ onSubmit, onClose }) => {
    const t = useTranslate();
    const [value, setValue] = useState('');

    const input = value.trim();
    const isValidXpub = BtcXpub.validate(input);
    const isSupportedXpub = isValidXpub && /^[XxZz]pub/.test(input);
    const isValid = BtcAddress.validate(input) || isSupportedXpub;
    const hasError = !isValid && input.length >= ERROR_VISIBLE_LENGTH;

    return (
        <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} hasClose={false} closeLabel={t('common.close')}>
                <Modal.Header closeLabel={t('common.close')}>
                    <Button
                        variant="primary"
                        size="small"
                        disabled={!isValid}
                        onClick={() => onSubmit(input)}
                    >
                        {t('common.continue')}
                    </Button>
                </Modal.Header>

                <Modal.Content hasFloatingClose={false}>
                    <Modal.Title>{t('addWallet.watchAccount.title')}</Modal.Title>
                    <Modal.Description>{t('addWallet.watchAccount.subtitle')}</Modal.Description>
                </Modal.Content>

                <div className={bodyStyles}>
                    <Input invalid={hasError}>
                        <Input.Field
                            autoFocus
                            className={fieldStyles}
                            value={value}
                            placeholder={t('addWallet.watchAccount.placeholder')}
                            autoComplete="off"
                            spellCheck={false}
                            onChange={event => setValue(event.target.value)}
                            onKeyDown={event => isValid && event.key === 'Enter' && onSubmit(input)}
                        />
                    </Input>

                    {hasError && (
                        <Text variant="bodyM" tone="accentRed" className={errorStyles}>
                            {t(
                                isValidXpub
                                    ? 'addWallet.watchAccount.unsupportedExtendedKey'
                                    : 'addWallet.watchAccount.invalidAddress'
                            )}
                        </Text>
                    )}

                    <Banner className={bannerStyles}>
                        <Banner.Content>
                            <Banner.Text>{t('addWallet.watchAccount.info')}</Banner.Text>
                        </Banner.Content>
                    </Banner>
                </div>
            </Modal.Popup>
        </Modal>
    );
};
