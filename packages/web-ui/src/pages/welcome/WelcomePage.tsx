import type { CSSProperties, FC } from 'react';
import { Trans } from 'react-i18next';

import { useTranslate } from '@safely/ux';
import QrCodeScanShield28 from '@safely/ux/assets/icons/28/qr-code-scan-shield-28.svg?react';
import Safely96 from '@safely/ux/assets/icons/96/safely-96.svg?react';

import {
    actionsStyles,
    backdropStyles,
    footerStyles,
    headingStyles,
    legalLinkStyles,
    legalStyles,
    logoStyles,
    primaryActionsStyles,
    rootStyles,
    subtitleStyles
} from './WelcomePage.styles';
import { Button, Icon, Text, welcomeBackdrop } from '../../shared';

export type WelcomePageProps = {
    onCreateWallet: () => void;
    onImportWallet: () => void;
    onMoreOptions: () => void;
    onLinkWithQr: () => void;
    onOpenTerms: () => void;
    onOpenPrivacy: () => void;
};

const backdropImageStyles = { '--welcome-backdrop': `url(${welcomeBackdrop})` } as CSSProperties;

export const WelcomePage: FC<WelcomePageProps> = props => {
    const {
        onCreateWallet,
        onImportWallet,
        onMoreOptions,
        onLinkWithQr,
        onOpenTerms,
        onOpenPrivacy
    } = props;

    const t = useTranslate();

    return (
        <div className={rootStyles}>
            <div className={backdropStyles} style={backdropImageStyles} />

            <div className={footerStyles}>
                <div className={logoStyles}>
                    <Icon asset={Safely96} size={96} tone="constantWhite" />
                </div>

                <div className={headingStyles}>
                    <Text variant="titleM" tone="constantWhite" align="center">
                        {t('welcome.title')}
                    </Text>
                    <Text
                        variant="bodyL"
                        tone="constantWhite"
                        align="center"
                        className={subtitleStyles}
                    >
                        {t('welcome.subtitle')}
                    </Text>
                </div>

                <div className={actionsStyles}>
                    <div className={primaryActionsStyles}>
                        <Button variant="primary" isFullWidth onClick={onCreateWallet}>
                            {t('welcome.newWallet')}
                        </Button>
                        <Button variant="secondary" isFullWidth onClick={onImportWallet}>
                            {t('welcome.importWallet')}
                        </Button>
                        <Button variant="secondary" isFullWidth onClick={onMoreOptions}>
                            {t('welcome.moreOptions')}
                        </Button>
                    </div>

                    <Button
                        variant="accent"
                        isFullWidth
                        iconRight={<Icon asset={QrCodeScanShield28} size={28} />}
                        onClick={onLinkWithQr}
                    >
                        {t('welcome.linkWithQr')}
                    </Button>
                </div>

                <Text variant="bodyS" tone="tertiary" align="center" className={legalStyles}>
                    <Trans
                        i18nKey="welcome.legal"
                        components={{
                            terms: (
                                <button
                                    type="button"
                                    className={legalLinkStyles}
                                    onClick={onOpenTerms}
                                />
                            ),
                            privacy: (
                                <button
                                    type="button"
                                    className={legalLinkStyles}
                                    onClick={onOpenPrivacy}
                                />
                            )
                        }}
                    />
                </Text>
            </div>
        </div>
    );
};
