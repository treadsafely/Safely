import { useNavigation } from '@react-navigation/core';
import {
    CommonActions,
    StackActions,
    type StaticScreenProps,
    usePreventRemove
} from '@react-navigation/native';
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { z } from 'zod';

import { ellipsisMiddle, MnemonicResource, type PortfolioMeta } from '@safely/core';
import {
    parseFlameDevnetSeedParam,
    parseFlameDevnetWalletNameParam,
    SecurityCheckCancelledError,
    useErrorToast,
    useFirstPortfolioName,
    useFlameDevnetWalletPreview,
    useFlameWalletOutputs,
    useHasAccount,
    useActiveAccountMeta,
    useExistingFlameDevnetPortfolio,
    useImportFlameDevnetPortfolioFromSeed,
    useNewPortfolioFallbackName,
    useNumberFormatter,
    useSetActivePortfolio,
    useToast
} from '@safely/ux';

import { PortfolioName } from '@mobile/entities/portfolio';
import { useIsAppRestricted } from '@mobile/entities/restrictions';
import { usePasscode } from '@mobile/entities/security';
import { resolveStartRoute } from '@mobile/shared/navigation';
import {
    Button,
    Checkbox,
    Icon,
    ImportWallet96,
    List,
    Screen,
    TableCell,
    Text,
    TouchableOpacity
} from '@mobile/shared/ui';

import { styles } from './ImportFlameDevnetWalletModal.styles';

type ImportFlameDevnetWalletModalProps = StaticScreenProps<
    { testseed?: unknown; walletName?: unknown } | undefined
>;

// a link that repeats a key (query and fragment) delivers an array
const sStringParam = z.string().catch('');

const DEVICE_LINK_ROUTES = new Set(['SignInScreen', 'SignInModal']);

const IMPORT_ERRORS = {
    InvalidMnemonicError: 'importWalletScreen.errors.invalidMnemonic',
    PortfolioGenerationFailedError: 'importWalletScreen.errors.failedToGenerate'
};

type ImportFlameDevnetWalletViewProps = {
    mnemonicResource: MnemonicResource;
    walletName: string;
    subtitle: string;
    isPending: boolean;
    onLeave: () => void;
    onImport: (meta: PortfolioMeta) => void;
};

const ImportFlameDevnetWalletView = (props: ImportFlameDevnetWalletViewProps) => {
    const { mnemonicResource, walletName, subtitle, isPending, onLeave, onImport } = props;

    const { t } = useTranslation();
    const formatter = useNumberFormatter();
    const errorToast = useErrorToast(IMPORT_ERRORS);
    const [isFromTrustedSite, setIsFromTrustedSite] = useState(false);

    const { meta, walletQuery } = useFlameDevnetWalletPreview(mnemonicResource, walletName);
    const wallet = walletQuery.data ?? null;
    const balance = useFlameWalletOutputs(wallet).data?.balance;

    const shownErrorRef = useRef<unknown>(null);
    useEffect(() => {
        const { error } = walletQuery;
        if (!error || shownErrorRef.current === error) return;

        shownErrorRef.current = error;
        errorToast(error);
        onLeave();
    }, [walletQuery, errorToast, onLeave]);

    const handleLeave = () => {
        if (!isPending) onLeave();
    };

    const toggleTrustedSite = () => setIsFromTrustedSite(prev => !prev);

    return (
        <Screen>
            <Screen.Header>
                <Screen.Header.Title />
                <Screen.Header.CloseButton onPress={handleLeave} />
            </Screen.Header>
            <Screen.Scrollable>
                <View style={styles.iconBox}>
                    <Icon icon={ImportWallet96} />
                </View>

                <View style={styles.titleBox}>
                    <Text textAlign="center" variant="titleM">
                        {t('importFlameDevnetWallet.title')}
                    </Text>
                    <Text textAlign="center" variant="bodyL" color="secondary">
                        {subtitle}
                    </Text>
                </View>

                <View style={styles.table}>
                    <List.Group withoutBottomMargin>
                        <TableCell columnDivider style={styles.cell}>
                            <TableCell.Column leading style={styles.column}>
                                <TableCell.Label>
                                    {t('importFlameDevnetWallet.walletLabel')}
                                </TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column style={styles.column}>
                                <PortfolioName meta={meta} fontVariant="bodyM" color="primary" />
                            </TableCell.Column>
                        </TableCell>
                        <TableCell columnDivider style={styles.cell}>
                            <TableCell.Column leading style={styles.column}>
                                <TableCell.Label>
                                    {t('importFlameDevnetWallet.balanceLabel')}
                                </TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column style={styles.column}>
                                <TableCell.Value skeleton>
                                    {balance?.format(formatter, { fullPrecision: true })}
                                </TableCell.Value>
                            </TableCell.Column>
                        </TableCell>
                        <TableCell
                            columnDivider
                            rowDivider={false}
                            style={styles.cell}
                            copyable={wallet?.receivingAddress}
                        >
                            <TableCell.Column leading style={styles.column}>
                                <TableCell.Label>
                                    {t('importFlameDevnetWallet.addressLabel')}
                                </TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column style={styles.column}>
                                <TableCell.Value skeleton>
                                    {wallet
                                        ? ellipsisMiddle(wallet.receivingAddress, 8)
                                        : undefined}
                                </TableCell.Value>
                            </TableCell.Column>
                        </TableCell>
                    </List.Group>
                </View>

                <View style={styles.description}>
                    <Text textAlign="center" variant="bodyM" color="tertiary">
                        {t('importFlameDevnetWallet.devnetOnly')}
                    </Text>
                </View>
            </Screen.Scrollable>

            <View style={styles.footer}>
                <View style={styles.buttons}>
                    <Button
                        style={styles.button}
                        type="secondary"
                        size="large"
                        disabled={isPending}
                        onPress={handleLeave}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        style={styles.button}
                        type="primary"
                        size="large"
                        isLoading={isPending}
                        disabled={!isFromTrustedSite || !wallet}
                        onPress={() => onImport(meta)}
                    >
                        {t('importFlameDevnetWallet.importButton')}
                    </Button>
                </View>
                <TouchableOpacity onPress={toggleTrustedSite} style={styles.trustedSite}>
                    <Checkbox
                        size="small"
                        isChecked={isFromTrustedSite}
                        onPress={toggleTrustedSite}
                    />
                    <Text variant="bodyM" color="secondary">
                        <Trans
                            i18nKey="importFlameDevnetWallet.trustedSite"
                            components={{ site: <Text variant="bodyM" color="link" /> }}
                        />
                    </Text>
                </TouchableOpacity>
            </View>
        </Screen>
    );
};

type ImportFlowProps = {
    mnemonicResource: MnemonicResource;
    linkWalletName: string | undefined;
    hasLeftRef: RefObject<boolean>;
    leave: () => void;
};

const NewAccountImportFlow = (props: ImportFlowProps) => {
    const { mnemonicResource, linkWalletName, hasLeftRef, leave } = props;
    const { t } = useTranslation();
    const navigation = useNavigation();
    const firstPortfolioName = useFirstPortfolioName();

    const continueToPasscode = (meta: PortfolioMeta) => {
        if (hasLeftRef.current) return;
        hasLeftRef.current = true;
        navigation.dispatch(
            StackActions.replace('OnboardingPasscodeScreen', {
                source: {
                    kind: 'flameDevnet',
                    mnemonicAccessor: new MnemonicResource(mnemonicResource.value)
                },
                firstPortfolioName: meta.name,
                headerType: 'back'
            })
        );
    };

    return (
        <ImportFlameDevnetWalletView
            mnemonicResource={mnemonicResource}
            walletName={linkWalletName ?? firstPortfolioName}
            subtitle={t('importFlameDevnetWallet.subtitleNewAccount')}
            isPending={false}
            onLeave={leave}
            onImport={continueToPasscode}
        />
    );
};

const AccountImportFlow = (props: ImportFlowProps) => {
    const { mnemonicResource, linkWalletName, hasLeftRef, leave } = props;
    const { t } = useTranslation();
    const navigation = useNavigation();
    const toast = useToast();
    const errorToast = useErrorToast(IMPORT_ERRORS);
    const accountName = useActiveAccountMeta().name;
    const fallbackWalletName = useNewPortfolioFallbackName();
    // a snapshot: after this modal's own import the list holds the wallet too
    const duplicate = useRef(useExistingFlameDevnetPortfolio(mnemonicResource)).current;
    const { mutate: setActivePortfolio } = useSetActivePortfolio();
    const { mutateAsync: importFlameDevnetPortfolio, isPending } =
        useImportFlameDevnetPortfolioFromSeed();

    const resetToTabs = useCallback(() => {
        hasLeftRef.current = true;
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'TabsNavigator' }] }));
    }, [hasLeftRef, navigation]);

    const isImportDoneRef = useRef(false);
    // the success reset fires before `isPending` drops, so it is let through here
    usePreventRemove(isPending, ({ data }) => {
        if (isImportDoneRef.current) navigation.dispatch(data.action);
    });

    useEffect(() => {
        if (!duplicate || hasLeftRef.current) return;

        setActivePortfolio({ id: duplicate.id });
        toast({ message: t('importFlameDevnetWallet.alreadyImported') });
        resetToTabs();
    }, [duplicate, hasLeftRef, setActivePortfolio, toast, t, resetToTabs]);

    const handleImport = async (meta: PortfolioMeta) => {
        try {
            await importFlameDevnetPortfolio({ mnemonicResource, meta });
            isImportDoneRef.current = true;
            toast({ message: t('importFlameDevnetWallet.imported') });
            resetToTabs();
        } catch (error) {
            if (!(error instanceof SecurityCheckCancelledError)) {
                errorToast(error);
            }
        }
    };

    if (duplicate) return null;

    return (
        <ImportFlameDevnetWalletView
            mnemonicResource={mnemonicResource}
            walletName={linkWalletName ?? fallbackWalletName}
            subtitle={t('importFlameDevnetWallet.subtitle', { accountName })}
            isPending={isPending}
            onLeave={leave}
            onImport={handleImport}
        />
    );
};

type ImportFlameDevnetWalletFlowProps = {
    testseed: string;
    linkWalletName: string | undefined;
};

const ImportFlameDevnetWalletFlow = (props: ImportFlameDevnetWalletFlowProps) => {
    const { testseed } = props;
    // a repeated link for the same phrase must not rename the wallet under a ticked checkbox
    const linkWalletName = useRef(props.linkWalletName).current;
    const mnemonicResource = useMemo(
        () => new MnemonicResource(parseFlameDevnetSeedParam(testseed)),
        [testseed]
    );
    useEffect(() => () => mnemonicResource.close(), [mnemonicResource]);
    const navigation = useNavigation();
    const hasAccount = useHasAccount();
    const isRestricted = useIsAppRestricted();
    const { isSet: hasPasscode } = usePasscode();
    const hadAccountOnOpen = useRef(hasAccount).current;
    const isDeviceLinkInProgress = useRef(
        navigation.getState()?.routes.some(route => DEVICE_LINK_ROUTES.has(route.name)) ?? false
    ).current;
    const hasLeftRef = useRef(false);

    const leave = useCallback(() => {
        if (hasLeftRef.current) return;
        hasLeftRef.current = true;

        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [resolveStartRoute({ isRestricted, hasAccount, hasPasscode })]
                })
            );
        }
    }, [navigation, isRestricted, hasAccount, hasPasscode]);

    const isUnavailable =
        isDeviceLinkInProgress || (hadAccountOnOpen && (!hasAccount || !hasPasscode));

    useEffect(() => {
        if (isUnavailable) leave();
    }, [isUnavailable, leave]);

    if (isUnavailable) return null;

    const Flow = hadAccountOnOpen ? AccountImportFlow : NewAccountImportFlow;

    return (
        <Flow
            mnemonicResource={mnemonicResource}
            linkWalletName={linkWalletName}
            hasLeftRef={hasLeftRef}
            leave={leave}
        />
    );
};

export const ImportFlameDevnetWalletModal = (props: ImportFlameDevnetWalletModalProps) => {
    const testseed = sStringParam.parse(props.route.params?.testseed);
    const linkWalletName = parseFlameDevnetWalletNameParam(
        sStringParam.parse(props.route.params?.walletName)
    );

    // a second link updates the params of the open modal; a new phrase must start over
    return (
        <ImportFlameDevnetWalletFlow
            key={testseed}
            testseed={testseed}
            linkWalletName={linkWalletName}
        />
    );
};
