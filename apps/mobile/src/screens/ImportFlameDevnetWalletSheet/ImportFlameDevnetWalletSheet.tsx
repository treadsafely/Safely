import { useNavigation } from '@react-navigation/core';
import { CommonActions, type StaticScreenProps } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import {
    parseFlameDevnetSeedParam,
    SecurityCheckCancelledError,
    useErrorToast,
    useHasAccount,
    useImportFlameDevnetPortfolioFromSeed,
    useToast
} from '@safely/ux';

type ImportFlameDevnetWalletSheetProps = StaticScreenProps<{ testseed?: string } | undefined>;

export const ImportFlameDevnetWalletSheet = (props: ImportFlameDevnetWalletSheetProps) => {
    const testseed = props.route.params?.testseed ?? '';
    const { t } = useTranslation();
    const navigation = useNavigation();
    const toast = useToast();
    const hasAccount = useHasAccount();
    const { mutateAsync: importFlameDevnetPortfolio } = useImportFlameDevnetPortfolioFromSeed();
    const errorToast = useErrorToast({
        InvalidMnemonicError: 'importWalletScreen.errors.invalidMnemonic'
    });
    const isStartedRef = useRef(false);

    useEffect(() => {
        if (isStartedRef.current) return;
        isStartedRef.current = true;

        const resetTo = (name: 'TabsNavigator' | 'WelcomeScreen') =>
            navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name }] }));
        // a link that cold-starts the app leaves nothing underneath this sheet
        const leave = () => {
            if (navigation.canGoBack()) {
                navigation.goBack();
            } else {
                resetTo(hasAccount ? 'TabsNavigator' : 'WelcomeScreen');
            }
        };

        if (!hasAccount) {
            toast({ message: t('importFlameDevnetWallet.noAccount') });
            leave();
            return;
        }

        importFlameDevnetPortfolio({ mnemonic: parseFlameDevnetSeedParam(testseed) }).then(
            () => {
                toast({ message: t('importFlameDevnetWallet.imported') });
                resetTo('TabsNavigator');
            },
            (error: unknown) => {
                if (!(error instanceof SecurityCheckCancelledError)) {
                    errorToast(error);
                }
                leave();
            }
        );
    }, [hasAccount, testseed, importFlameDevnetPortfolio, toast, errorToast, navigation, t]);

    return null;
};
