import type { FC, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Trans } from 'react-i18next';

import type { PortfolioMeta } from '@safely/core';
import { ellipsisMiddle, MnemonicResource } from '@safely/core';
import {
    parseFlameDevnetSeedParam,
    parseFlameDevnetWalletNameParam,
    useActiveAccountMeta,
    useFirstPortfolioName,
    useFlameDevnetAccountImport,
    useFlameDevnetImportPreview,
    useNewPortfolioFallbackName,
    useNumberFormatter,
    useTranslate
} from '@safely/ux';
import ImportWallet96 from '@safely/ux/assets/icons/96/import-wallet-96.svg?react';

import {
    bodyStyles,
    buttonsStyles,
    mediaStyles,
    noteStyles,
    tableStyles,
    trustedSiteStyles
} from './ImportFlameDevnetWalletModal.styles';
import { WalletName } from '../../entities';
import {
    Button,
    Checkbox,
    Icon,
    List,
    Modal,
    Skeleton,
    StepCard,
    TableCell,
    Text
} from '../../shared';

export type ImportFlameDevnetWalletFlow =
    | { kind: 'account' }
    | { kind: 'onboarding'; onCreateAccount: (mnemonic: string[], walletName: string) => void };

export type ImportFlameDevnetWalletModalProps = {
    testseed: string;
    walletName?: string;
    flow: ImportFlameDevnetWalletFlow;
    hasBackdrop?: boolean;
    onClose: () => void;
};

const InfoRow: FC<{ label: string; copyable?: string; children: ReactNode }> = props => {
    const { label, copyable, children } = props;

    const t = useTranslate();

    return (
        <TableCell hasColumnDivider copyable={copyable} copiedLabel={t('actions.copied')}>
            <TableCell.Column width="label">
                <TableCell.Label>{label}</TableCell.Label>
            </TableCell.Column>
            <TableCell.Column>
                <TableCell.Value>{children}</TableCell.Value>
            </TableCell.Column>
        </TableCell>
    );
};

type ImportFlameDevnetWalletViewProps = {
    mnemonicResource: MnemonicResource;
    walletName: string;
    subtitle: string;
    isPending: boolean;
    hasBackdrop: boolean;
    onLeave: () => void;
    onImport: (meta: PortfolioMeta) => void;
};

const ImportFlameDevnetWalletView: FC<ImportFlameDevnetWalletViewProps> = props => {
    const { mnemonicResource, walletName, subtitle, isPending, hasBackdrop, onLeave, onImport } =
        props;

    const t = useTranslate();
    const formatter = useNumberFormatter();
    const [isFromTrustedSite, setIsFromTrustedSite] = useState(false);
    const { meta, wallet, balance } = useFlameDevnetImportPreview(
        mnemonicResource,
        walletName,
        onLeave
    );

    return (
        <StepCard
            hasShadow={hasBackdrop}
            hasBackdrop={hasBackdrop}
            onBack={isPending ? undefined : onLeave}
        >
            <div className={bodyStyles}>
                <div className={mediaStyles}>
                    <Icon asset={ImportWallet96} size={96} />
                </div>

                <Modal.Content hasFloatingClose={false}>
                    <Modal.Title>{t('importFlameDevnetWallet.title')}</Modal.Title>
                    <Modal.Description>{subtitle}</Modal.Description>
                </Modal.Content>

                <List className={tableStyles}>
                    <List.Group variant="divided">
                        <InfoRow label={t('importFlameDevnetWallet.walletLabel')}>
                            <WalletName meta={meta} />
                        </InfoRow>

                        <InfoRow label={t('importFlameDevnetWallet.balanceLabel')}>
                            {balance === undefined ? (
                                <Skeleton width={72} height={20} />
                            ) : (
                                balance.format(formatter, { fullPrecision: true })
                            )}
                        </InfoRow>

                        <InfoRow
                            label={t('importFlameDevnetWallet.addressLabel')}
                            copyable={wallet?.receivingAddress}
                        >
                            {wallet === null ? (
                                <Skeleton width={120} height={20} />
                            ) : (
                                ellipsisMiddle(wallet.receivingAddress, 8)
                            )}
                        </InfoRow>
                    </List.Group>
                </List>

                <Text as="p" variant="bodyM" tone="tertiary" align="center" className={noteStyles}>
                    {t('importFlameDevnetWallet.devnetOnly')}
                </Text>

                <div className={buttonsStyles}>
                    <Button variant="secondary" disabled={isPending} onClick={onLeave}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        variant="primary"
                        isLoading={isPending}
                        disabled={!isFromTrustedSite || wallet === null}
                        onClick={() => onImport(meta)}
                    >
                        {t('importFlameDevnetWallet.importButton')}
                    </Button>
                </div>

                <label className={trustedSiteStyles}>
                    <Checkbox
                        checked={isFromTrustedSite}
                        onCheckedChange={checked => setIsFromTrustedSite(checked)}
                    />
                    <Text variant="bodyM" tone="secondary">
                        <Trans
                            i18nKey="importFlameDevnetWallet.trustedSite"
                            components={{ site: <Text variant="bodyM" tone="link" /> }}
                        />
                    </Text>
                </label>
            </div>
        </StepCard>
    );
};

type ImportFlowProps = {
    mnemonicResource: MnemonicResource;
    linkWalletName: string | undefined;
    hasBackdrop: boolean;
    onClose: () => void;
};

const OnboardingImportFlow: FC<
    ImportFlowProps & { onCreateAccount: (mnemonic: string[], walletName: string) => void }
> = props => {
    const { mnemonicResource, linkWalletName, hasBackdrop, onClose, onCreateAccount } = props;

    const t = useTranslate();
    const firstPortfolioName = useFirstPortfolioName();

    return (
        <ImportFlameDevnetWalletView
            mnemonicResource={mnemonicResource}
            walletName={linkWalletName ?? firstPortfolioName}
            subtitle={t('importFlameDevnetWallet.subtitleNewAccount')}
            isPending={false}
            hasBackdrop={hasBackdrop}
            onLeave={onClose}
            onImport={meta => onCreateAccount([...mnemonicResource.value], meta.name)}
        />
    );
};

const AccountImportFlow: FC<ImportFlowProps> = props => {
    const { mnemonicResource, linkWalletName, hasBackdrop, onClose } = props;

    const t = useTranslate();
    const accountName = useActiveAccountMeta().name;
    const fallbackWalletName = useNewPortfolioFallbackName();
    const { isDuplicate, isPending, importWallet } = useFlameDevnetAccountImport(
        mnemonicResource,
        onClose
    );

    if (isDuplicate) return null;

    return (
        <ImportFlameDevnetWalletView
            mnemonicResource={mnemonicResource}
            walletName={linkWalletName ?? fallbackWalletName}
            subtitle={t('importFlameDevnetWallet.subtitle', { accountName })}
            isPending={isPending}
            hasBackdrop={hasBackdrop}
            onLeave={onClose}
            onImport={meta => void importWallet(meta)}
        />
    );
};

const ImportFlow: FC<ImportFlameDevnetWalletModalProps> = props => {
    const { testseed, flow, hasBackdrop = true, onClose } = props;
    const linkWalletName = useRef(parseFlameDevnetWalletNameParam(props.walletName ?? '')).current;
    const mnemonicResource = useMemo(
        () => new MnemonicResource(parseFlameDevnetSeedParam(testseed)),
        [testseed]
    );
    useEffect(() => () => mnemonicResource.close(), [mnemonicResource]);

    if (flow.kind === 'onboarding') {
        return (
            <OnboardingImportFlow
                mnemonicResource={mnemonicResource}
                linkWalletName={linkWalletName}
                hasBackdrop={hasBackdrop}
                onClose={onClose}
                onCreateAccount={flow.onCreateAccount}
            />
        );
    }

    return (
        <AccountImportFlow
            mnemonicResource={mnemonicResource}
            linkWalletName={linkWalletName}
            hasBackdrop={hasBackdrop}
            onClose={onClose}
        />
    );
};

export const ImportFlameDevnetWalletModal: FC<ImportFlameDevnetWalletModalProps> = props => (
    <ImportFlow key={props.testseed} {...props} />
);
