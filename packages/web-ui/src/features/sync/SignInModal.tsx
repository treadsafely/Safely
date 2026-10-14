import { QRCodeSVG } from 'qrcode.react';
import type { FC } from 'react';

import { useTranslate } from '@safely/ux';
import DeviceLink from '@safely/ux/assets/icons/56/device-link.svg?react';

import {
    bannerStyles,
    cardStyles,
    contentStyles,
    copiedStyles,
    popupStyles,
    QR_SIZE,
    qrStyles,
    qrUnderHeaderStyles
} from './SignInModal.styles';
import { Banner, Modal, OnboardingCard, Toast, useCopyToClipboard } from '../../shared';

export type SignInModalProps = {
    connectionString: string;
    appearance?: 'modal' | 'onboarding';
    onClose: () => void;
};

export const SignInModal: FC<SignInModalProps> = props => {
    const { connectionString, appearance = 'modal', onClose } = props;

    const t = useTranslate();
    const { isCopied, copy } = useCopyToClipboard();

    const content = (
        <>
            <div className={appearance === 'onboarding' ? qrUnderHeaderStyles : qrStyles}>
                <button type="button" className={cardStyles} onClick={() => copy(connectionString)}>
                    <QRCodeSVG value={connectionString} size={QR_SIZE} level="H" />
                </button>

                {isCopied && (
                    <Toast
                        variant="white"
                        message={t('actions.copied')}
                        className={copiedStyles}
                        role="status"
                    />
                )}
            </div>

            <Modal.Content className={contentStyles}>
                <Modal.Title>{t('signIn.title')}</Modal.Title>
                <Modal.Description>{t('signIn.description')}</Modal.Description>
            </Modal.Content>

            <Banner className={bannerStyles}>
                <Banner.Content>
                    <Banner.Text>{t('signIn.banner')}</Banner.Text>
                </Banner.Content>
                <Banner.Icon asset={DeviceLink} />
            </Banner>
        </>
    );

    if (appearance === 'onboarding') {
        return (
            <OnboardingCard hasShadow={false} onBack={onClose}>
                {content}
            </OnboardingCard>
        );
    }

    return (
        <Modal open onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')}>
                {content}
            </Modal.Popup>
        </Modal>
    );
};
