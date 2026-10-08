import { useNavigation } from '@react-navigation/core';
import { CommonActions } from '@react-navigation/native';
import { useCallback } from 'react';
import { Keyboard } from 'react-native';

import {
    MnemonicResource,
    type PortfolioMeta,
    type PortfolioMetaIcon,
    type PortfolioNetworkType
} from '@safely/core';
import type { AccountPortfolioSource } from '@safely/ux';
import { useAppContext, useCreateAccount, useErrorToast, useLoader } from '@safely/ux';

// TODO IMPORT Discuss with Max what to do with this
// eslint-disable-next-line boundaries/element-types
import { tabsInitialState } from '@mobile/app/navigation/tabs';
import { usePasscode } from '@mobile/entities/security';

type OnboardingCustomizeParams = {
    defaultName: string;
    defaultIcon: PortfolioMetaIcon;
    onSave: (meta: Pick<PortfolioMeta, 'name' | 'icon'>) => Promise<void>;
};

export function useOnboardingFlow() {
    const navigation = useNavigation();
    const { mutateAsync: createAccount } = useCreateAccount({
        setActive: true
    });
    const { withLoader } = useLoader();
    const { set: setPasscode } = usePasscode();
    const errorToast = useErrorToast({
        InvalidMnemonicError: 'importWalletScreen.errors.invalidMnemonic',
        PortfolioGenerationFailedError: 'importWalletScreen.errors.failedToGenerate'
    });
    const {
        storage: {
            sync: { getSecureEncrypted }
        }
    } = useAppContext();

    const onSuccessCreate = useCallback(() => {
        navigation.navigate('OnboardingPasscodeScreen', {
            source: { kind: 'generated' },
            headerType: 'back'
        });
    }, [navigation]);

    const onSuccessSignIn = useCallback(() => {
        navigation.navigate('OnboardingPasscodeScreen', { source: null, headerType: 'back' });
    }, [navigation]);

    const onMnemonicReady = useCallback(
        (mnemonic: string[], networkType: PortfolioNetworkType) => {
            const accessor = new MnemonicResource(mnemonic);

            navigation.navigate('OnboardingPasscodeScreen', {
                source: { kind: 'imported', mnemonicAccessor: accessor, networkType },
                headerType: 'back'
            });
        },
        [navigation]
    );

    const onWatchOnlyReady = useCallback(
        (input: string, networkType: PortfolioNetworkType) => {
            navigation.navigate('OnboardingPasscodeScreen', {
                source: { kind: 'watchOnly', input, networkType },
                headerType: 'back'
            });
        },
        [navigation]
    );

    const onLedgerReady = useCallback(
        (
            masterFingerprint: string,
            deviceModel: string,
            walletName: string,
            accounts: { index: number; xpub: string; name: string }[]
        ) => {
            navigation.navigate('OnboardingPasscodeScreen', {
                source: { kind: 'ledger', masterFingerprint, deviceModel, walletName, accounts },
                headerType: 'back'
            });
        },
        [navigation]
    );

    const onPasscodeReady = useCallback(
        async (passcode: string, source: AccountPortfolioSource | null) => {
            await setPasscode(passcode);

            if (source) {
                Keyboard.dismiss();
                try {
                    await withLoader(async () => {
                        using secureEncryptedStorage = getSecureEncrypted();

                        // don't ask for the password while setting app initially after first account creation during onboarding to provide smooth user experience
                        secureEncryptedStorage.UNSAFE_SKIP_SECURITY_CHECK_unlock();

                        await createAccount({ secureEncryptedStorage, firstPortfolio: source });
                    });
                } catch (error) {
                    errorToast(error);
                    throw error;
                }
            }

            navigation.navigate('BiometryScreen');
        },
        [navigation, setPasscode, createAccount, withLoader, getSecureEncrypted, errorToast]
    );

    const resetToTabs = useCallback(() => {
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'TabsNavigator', state: tabsInitialState }]
            })
        );
    }, [navigation]);

    const onBiometryFinished = useCallback(() => {
        navigation.dispatch(CommonActions.navigate('OnboardingNotificationsScreen'));
    }, [navigation]);

    const onNotificationsFinished = useCallback(() => {
        resetToTabs();
    }, [resetToTabs]);

    const onAccountCreatedFinished = useCallback(
        (customize?: OnboardingCustomizeParams) => {
            if (!customize) {
                resetToTabs();
                return;
            }

            navigation.dispatch(
                CommonActions.reset({
                    index: 1,
                    routes: [
                        { name: 'TabsNavigator', state: tabsInitialState },
                        { name: 'CustomizeWalletModal', params: customize }
                    ]
                })
            );
        },
        [navigation, resetToTabs]
    );

    return {
        onSuccessCreate,
        onSuccessSignIn,
        onMnemonicReady,
        onWatchOnlyReady,
        onLedgerReady,
        onPasscodeReady,
        onBiometryFinished,
        onNotificationsFinished,
        onAccountCreatedFinished
    };
}
