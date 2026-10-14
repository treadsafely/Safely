import type { CSSProperties, FC } from 'react';
import { Trans } from 'react-i18next';

import { useTranslate } from '@safely/ux';
import QrCodeScanShield28 from '@safely/ux/assets/icons/28/qr-code-scan-shield-28.svg?react';
import SafelyTile from '@safely/ux/assets/images/safely-tile.svg?react';

import {
    actionsColumnStyles,
    actionsStyles,
    columnStyles,
    backdropStyles,
    headingStyles,
    linkWithQrStyles,
    legalLinkStyles,
    legalStyles,
    logoStyles,
    primaryActionsStyles,
    rootStyles,
    subtitleStyles
} from './WelcomePage.styles';
import { Button, Icon, OnboardingCard, Text, welcomeBackdrop } from '../../shared';

export type WelcomePageProps = {
    onCreateWallet: () => void;
    onImportWallet: () => void;
    onWatchAccount: () => void;
    onLinkWithQr: () => void;
    onOpenTerms: () => void;
    onOpenPrivacy: () => void;
};

const backdropImageStyles = { '--welcome-backdrop': `url(${welcomeBackdrop})` } as CSSProperties;

const LOGO_SIZE = 80;

export const WelcomePage: FC<WelcomePageProps> = props => {
    const {
        onCreateWallet,
        onImportWallet,
        onWatchAccount,
        onLinkWithQr,
        onOpenTerms,
        onOpenPrivacy
    } = props;

    const t = useTranslate();

    return (
        <div className={rootStyles}>
            <div className={backdropStyles} style={backdropImageStyles} />

            <OnboardingCard>
                <div className={columnStyles}>
                    <div className={logoStyles}>
                        <SafelyTile width={LOGO_SIZE} height={LOGO_SIZE} />
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
                        <div className={actionsColumnStyles}>
                            <div className={primaryActionsStyles}>
                                <Button
                                    variant="primary"
                                    size="small"
                                    isFullWidth
                                    onClick={onCreateWallet}
                                >
                                    {t('welcome.newWallet')}
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="small"
                                    isFullWidth
                                    onClick={onImportWallet}
                                >
                                    {t('welcome.importWallet')}
                                </Button>

                                <Button
                                    variant="secondary"
                                    size="small"
                                    isFullWidth
                                    onClick={onWatchAccount}
                                >
                                    {t('moreOptions.watchAccount')}
                                </Button>
                            </div>

                            <Button
                                variant="accent"
                                size="small"
                                isFullWidth
                                className={linkWithQrStyles}
                                iconRight={<Icon asset={QrCodeScanShield28} size={16} />}
                                onClick={onLinkWithQr}
                            >
                                {t('welcome.linkWithQr')}
                            </Button>
                        </div>
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
            </OnboardingCard>
        </div>
    );
};
