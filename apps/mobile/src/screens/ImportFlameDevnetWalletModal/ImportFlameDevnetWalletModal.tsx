import { useNavigation } from '@react-navigation/core';
import { CommonActions, type StaticScreenProps, usePreventRemove } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ellipsisMiddle, MnemonicResource } from '@safely/core';
import {
    parseFlameDevnetSeedParam,
    SecurityCheckCancelledError,
    useErrorToast,
    useFlameDevnetWalletPreview,
    useFlameRatedAmount,
    useHasAccount,
    useActiveAccountMeta,
    useExistingFlameDevnetPortfolio,
    useImportFlameDevnetPortfolioFromSeed,
    useNumberFormatter,
    useSetActivePortfolio,
    useToast
} from '@safely/ux';

import { PortfolioName } from '@mobile/entities/portfolio';
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

type ImportFlameDevnetWalletModalProps = StaticScreenProps<{ testseed?: string } | undefined>;

const IMPORT_ERRORS = {
    InvalidMnemonicError: 'importWalletScreen.errors.invalidMnemonic',
    PortfolioGenerationFailedError: 'importWalletScreen.errors.failedToGenerate'
};

type ImportFlameDevnetWalletContentProps = {
    mnemonicResource: MnemonicResource;
    onLeave: () => void;
    onImported: () => void;
};

const ImportFlameDevnetWalletContent = (props: ImportFlameDevnetWalletContentProps) => {
    const { mnemonicResource, onLeave, onImported } = props;

    const { t } = useTranslation();
    const navigation = useNavigation();
    const formatter = useNumberFormatter();
    const accountName = useActiveAccountMeta().name;
    const errorToast = useErrorToast(IMPORT_ERRORS);
    const [isFromTrustedSite, setIsFromTrustedSite] = useState(false);

    const { meta, walletQuery } = useFlameDevnetWalletPreview(mnemonicResource);
    const wallet = walletQuery.data ?? null;
    const balance = useFlameRatedAmount(wallet).data?.amount;
    const { mutateAsync: importFlameDevnetPortfolio, isPending } =
        useImportFlameDevnetPortfolioFromSeed();

    const shownErrorRef = useRef<unknown>(null);
    useEffect(() => {
        const { error } = walletQuery;
        if (!error || shownErrorRef.current === error) return;

        shownErrorRef.current = error;
        errorToast(error);
        onLeave();
    }, [walletQuery, errorToast, onLeave]);

    const isImportDoneRef = useRef(false);
    // the success reset fires before `isPending` drops, so it is let through here
    usePreventRemove(isPending, ({ data }) => {
        if (isImportDoneRef.current) navigation.dispatch(data.action);
    });

    const handleLeave = () => {
        if (!isPending) onLeave();
    };

    const toggleTrustedSite = () => setIsFromTrustedSite(prev => !prev);

    const handleImport = async () => {
        try {
            await importFlameDevnetPortfolio({ mnemonicResource });
            isImportDoneRef.current = true;
            onImported();
        } catch (error) {
            if (!(error instanceof SecurityCheckCancelledError)) {
                errorToast(error);
            }
        }
    };

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
                        {t('importFlameDevnetWallet.subtitle', { accountName })}
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
                        onPress={handleImport}
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

const ImportFlameDevnetWalletFlow = ({ testseed }: { testseed: string }) => {
    const mnemonicResource = useMemo(
        () => new MnemonicResource(parseFlameDevnetSeedParam(testseed)),
        [testseed]
    );
    useEffect(() => () => mnemonicResource.close(), [mnemonicResource]);
    const { t } = useTranslation();
    const navigation = useNavigation();
    const toast = useToast();
    const hasAccount = useHasAccount();
    const hasLeftRef = useRef(false);
    // a snapshot: after this modal's own import the list holds the wallet too
    const duplicate = useRef(useExistingFlameDevnetPortfolio(mnemonicResource)).current;
    const { mutate: setActivePortfolio } = useSetActivePortfolio();

    const resetTo = useCallback(
        (name: 'TabsNavigator' | 'WelcomeScreen') =>
            navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name }] })),
        [navigation]
    );

    // a link that cold-starts the app leaves nothing underneath this modal
    const leave = useCallback(() => {
        if (hasLeftRef.current) return;
        hasLeftRef.current = true;

        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            resetTo(hasAccount ? 'TabsNavigator' : 'WelcomeScreen');
        }
    }, [navigation, resetTo, hasAccount]);

    const handleImported = () => {
        hasLeftRef.current = true;
        toast({ message: t('importFlameDevnetWallet.imported') });
        resetTo('TabsNavigator');
    };

    useEffect(() => {
        if (hasAccount || hasLeftRef.current) return;

        toast({ message: t('importFlameDevnetWallet.noAccount') });
        leave();
    }, [hasAccount, toast, leave, t]);

    useEffect(() => {
        if (!hasAccount || !duplicate || hasLeftRef.current) return;
        hasLeftRef.current = true;

        setActivePortfolio({ id: duplicate.id });
        toast({ message: t('importFlameDevnetWallet.alreadyImported') });
        resetTo('TabsNavigator');
    }, [hasAccount, duplicate, setActivePortfolio, toast, t, resetTo]);

    if (!hasAccount || duplicate) return null;

    return (
        <ImportFlameDevnetWalletContent
            mnemonicResource={mnemonicResource}
            onLeave={leave}
            onImported={handleImported}
        />
    );
};

export const ImportFlameDevnetWalletModal = (props: ImportFlameDevnetWalletModalProps) => {
    const testseed = props.route.params?.testseed ?? '';

    // a second link updates the params of the open modal; a new phrase must start over
    return <ImportFlameDevnetWalletFlow key={testseed} testseed={testseed} />;
};
