import { useNavigate } from '@tanstack/react-router';
import { useCallback, useRef, useState } from 'react';

import { MnemonicResource, PortfolioNetworkType } from '@safely/core';
import type { IUnlockableSecuredEncryptedStorage, OnboardedAccount } from '@safely/ux';
import {
    useAccountConnectedCallback,
    useAppContext,
    useCreateAccount,
    useCreateExistingAccountConnector,
    useErrorToast,
    useHasAccount,
    useLoader,
    useToast,
    useTranslate
} from '@safely/ux';

import { ROUTE } from '../../shared';
import { isBiometryAvailable } from '../biometry';
import { usePasscode } from '../passcode';

export type OnboardingStep =
    'moreOptions' | 'import' | 'watch' | 'signIn' | 'signInSuccess' | 'passcode' | 'biometry';

type OnboardingSource =
    | { kind: 'generated' }
    | { kind: 'imported'; mnemonic: string[] }
    | { kind: 'watchOnly'; input: string }
    | { kind: 'signedIn' };

export function useOnboardingFlow() {
    const navigate = useNavigate();
    const t = useTranslate();
    const toast = useToast();
    const { set: setPasscode } = usePasscode();
    const { mutateAsync: createAccount } = useCreateAccount({ setActive: true });
    const { withLoader } = useLoader();
    const errorToast = useErrorToast({
        InvalidMnemonicError: 'importWalletScreen.errors.invalidMnemonic'
    });
    const {
        storage: {
            sync: { getSecureEncrypted }
        }
    } = useAppContext();

    const hasAccount = useHasAccount();
    const signIn = useCreateExistingAccountConnector();
    const signInStorage = useRef<IUnlockableSecuredEncryptedStorage | null>(null);

    const [step, setStep] = useState<OnboardingStep | null>(hasAccount ? 'passcode' : null);
    const [inviterIkPubHex, setInviterIkPubHex] = useState<string | null>(null);
    const source = useRef<OnboardingSource | null>(hasAccount ? { kind: 'signedIn' } : null);

    const closeSignInStorage = useCallback(() => {
        signInStorage.current?.[Symbol.dispose]();
        signInStorage.current = null;
    }, []);

    const close = useCallback(() => {
        source.current = null;
        signIn.reset();
        closeSignInStorage();
        setStep(null);
    }, [signIn, closeSignInStorage]);
    const openMoreOptions = useCallback(() => setStep('moreOptions'), []);
    const openImport = useCallback(() => setStep('import'), []);
    const openWatch = useCallback(() => setStep('watch'), []);

    const startPasscode = useCallback((pending: OnboardingSource) => {
        source.current = pending;
        setStep('passcode');
    }, []);

    const startCreate = useCallback(() => startPasscode({ kind: 'generated' }), [startPasscode]);

    const onMnemonicReady = useCallback(
        (mnemonic: string[]) => startPasscode({ kind: 'imported', mnemonic }),
        [startPasscode]
    );

    const onWatchInputReady = useCallback(
        (input: string) => startPasscode({ kind: 'watchOnly', input }),
        [startPasscode]
    );

    const startSignIn = useCallback(async () => {
        signIn.reset();

        /* the store stays open until the pairing ends: the connector reads it while the QR is up */
        const secureEncryptedStorage = getSecureEncrypted();
        secureEncryptedStorage.UNSAFE_SKIP_SECURITY_CHECK_unlock();
        signInStorage.current = secureEncryptedStorage;

        try {
            await signIn.mutateAsync({ secureEncryptedStorage });
        } catch (error) {
            closeSignInStorage();
            errorToast(error);
            return;
        }

        setStep('signIn');
    }, [signIn, getSecureEncrypted, closeSignInStorage, errorToast]);

    const onAccountConnected = useCallback(
        (onboarded: OnboardedAccount) => {
            closeSignInStorage();
            setInviterIkPubHex(onboarded.inviterIkPubHex);
            source.current = { kind: 'signedIn' };
            setStep('signInSuccess');
        },
        [closeSignInStorage]
    );

    const onAccountConnectFailed = useCallback(() => {
        closeSignInStorage();
        setStep(null);
        toast({ message: t('signIn.timeout'), duration: 5000 });
    }, [closeSignInStorage, toast, t]);

    useAccountConnectedCallback(signIn.data, onAccountConnected, {
        setAsActive: true,
        onError: onAccountConnectFailed
    });

    const onSignInSuccessContinue = useCallback(() => setStep('passcode'), []);

    const goBackFromPasscode = useCallback(() => {
        const pending = source.current;

        if (pending?.kind === 'signedIn') {
            return;
        }

        source.current = null;

        if (pending?.kind === 'imported') {
            setStep('import');
            return;
        }

        setStep(pending?.kind === 'watchOnly' ? 'watch' : null);
    }, []);

    const createAccountFrom = useCallback(
        async (pending: OnboardingSource) => {
            await withLoader(async () => {
                using secureEncryptedStorage = getSecureEncrypted();
                secureEncryptedStorage.UNSAFE_SKIP_SECURITY_CHECK_unlock();

                if (pending.kind === 'imported') {
                    using mnemonicAccessor = new MnemonicResource(pending.mnemonic);

                    await createAccount({
                        secureEncryptedStorage,
                        firstPortfolio: {
                            kind: 'imported',
                            mnemonicAccessor,
                            networkType: PortfolioNetworkType.MAINNET
                        }
                    });
                    return;
                }

                if (pending.kind === 'watchOnly') {
                    await createAccount({
                        secureEncryptedStorage,
                        firstPortfolio: {
                            kind: 'watchOnly',
                            input: pending.input,
                            networkType: PortfolioNetworkType.MAINNET
                        }
                    });
                    return;
                }

                await createAccount({
                    secureEncryptedStorage,
                    firstPortfolio: { kind: 'generated' }
                });
            });
        },
        [withLoader, getSecureEncrypted, createAccount]
    );

    const createAndOpenMain = useCallback(async () => {
        const pending = source.current;

        if (pending === null) {
            return;
        }

        try {
            if (pending.kind !== 'signedIn') {
                await createAccountFrom(pending);
            }
        } catch (error) {
            errorToast(error);
            return;
        }

        source.current = null;
        await navigate({ to: ROUTE.main, replace: true });
    }, [createAccountFrom, errorToast, navigate]);

    const onPasscodeComplete = useCallback(
        async (passcode: string) => {
            if (source.current === null) {
                return;
            }

            try {
                await setPasscode(passcode);
            } catch (error) {
                errorToast(error);
                return;
            }

            if (await isBiometryAvailable()) {
                setStep('biometry');
                return;
            }

            await createAndOpenMain();
        },
        [setPasscode, errorToast, createAndOpenMain]
    );

    const onBiometryFinished = useCallback(() => void createAndOpenMain(), [createAndOpenMain]);

    return {
        step,
        connectionString: signIn.data?.connectionString,
        inviterIkPubHex,
        close,
        startSignIn,
        onSignInSuccessContinue,
        openMoreOptions,
        openImport,
        openWatch,
        startCreate,
        onMnemonicReady,
        onWatchInputReady,
        onPasscodeComplete,
        onBiometryFinished,
        goBackFromPasscode
    };
}
