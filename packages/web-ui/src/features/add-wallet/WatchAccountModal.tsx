import type { FC } from 'react';
import { useState } from 'react';

import { BtcAddress, BtcXpub } from '@safely/core';
import { useTranslate } from '@safely/ux';

import {
    bannerStyles,
    bodyStyles,
    compactBannerStyles,
    compactBodyStyles,
    errorStyles,
    fieldStyles,
    popupStyles,
    submitStyles
} from './WatchAccountModal.styles';
import { Banner, Button, Input, Modal, OnboardingCard, Text } from '../../shared';

export type WatchAccountModalProps = {
    appearance?: 'modal' | 'onboarding';
    onSubmit: (input: string) => void;
    onClose: () => void;
};

const ERROR_VISIBLE_LENGTH = 20;

export const WatchAccountModal: FC<WatchAccountModalProps> = props => {
    const { appearance = 'modal', onSubmit, onClose } = props;

    const t = useTranslate();
    const [value, setValue] = useState('');

    const input = value.trim();
    const isValidXpub = BtcXpub.validate(input);
    const isSupportedXpub = isValidXpub && /^[XxZz]pub/.test(input);
    const isValid = BtcAddress.validate(input) || isSupportedXpub;
    const hasError = !isValid && input.length >= ERROR_VISIBLE_LENGTH;

    const submit = (
        <Button variant="primary" size="small" disabled={!isValid} onClick={() => onSubmit(input)}>
            {t('common.continue')}
        </Button>
    );

    const content = (
        <>
            <Modal.Content hasFloatingClose={false}>
                <Modal.Title>{t('addWallet.watchAccount.title')}</Modal.Title>
                <Modal.Description>{t('addWallet.watchAccount.subtitle')}</Modal.Description>
            </Modal.Content>

            <div className={appearance === 'onboarding' ? compactBodyStyles : bodyStyles}>
                <Input invalid={hasError}>
                    <Input.Field
                        autoFocus
                        className={fieldStyles}
                        value={value}
                        placeholder={t('addWallet.watchAccount.placeholder')}
                        autoComplete="off"
                        spellCheck={false}
                        clearLabel={t('common.clear')}
                        onClear={() => setValue('')}
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

                <Banner
                    className={appearance === 'onboarding' ? compactBannerStyles : bannerStyles}
                >
                    <Banner.Content>
                        <Banner.Text>{t('addWallet.watchAccount.info')}</Banner.Text>
                    </Banner.Content>
                </Banner>
            </div>
        </>
    );

    if (appearance === 'onboarding') {
        return (
            <OnboardingCard hasShadow={false} onBack={onClose}>
                {content}
                <div className={submitStyles}>{submit}</div>
            </OnboardingCard>
        );
    }

    return (
        <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} hasClose={false} closeLabel={t('common.close')}>
                <Modal.Header closeLabel={t('common.close')}>{submit}</Modal.Header>

                {content}
            </Modal.Popup>
        </Modal>
    );
};
