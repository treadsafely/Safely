import { QRCodeSVG } from 'qrcode.react';
import type { FC, ReactNode } from 'react';

import { useTranslate } from '@safely/ux';
import DeviceLink from '@safely/ux/assets/icons/56/device-link.svg?react';

import { bannerStyles, cardStyles, copiedStyles, QR_SIZE } from './SignInContent.styles';
import { Banner, Toast, useCopyToClipboard } from '../../shared';

export type SignInContentProps = {
    connectionString: string;
    heading: ReactNode;
    className?: string;
};

export const SignInContent: FC<SignInContentProps> = props => {
    const { connectionString, heading, className } = props;

    const t = useTranslate();
    const { isCopied, copy } = useCopyToClipboard();

    return (
        <>
            <div className={className}>
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

            {heading}

            <Banner className={bannerStyles}>
                <Banner.Content>
                    <Banner.Text>{t('signIn.banner')}</Banner.Text>
                </Banner.Content>
                <Banner.Icon asset={DeviceLink} />
            </Banner>
        </>
    );
};
