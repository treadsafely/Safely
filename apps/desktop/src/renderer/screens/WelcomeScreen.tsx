import type { FC } from 'react';
import { useEffect, useState } from 'react';

import { useBootConfig, useLinking, useTrackOnboardingOpen, useTranslate } from '@safely/ux';
import {
    BiometryCard,
    ImportFlameDevnetWalletModal,
    ImportWalletModal,
    LedgerModals,
    PasscodeCard,
    SignInCard,
    SignInSuccessCard,
    WatchAccountModal,
    WelcomePage
} from '@safely/web-ui';

import type { ImportFlameDevnetLink } from '../features';
import {
    EnableBiometryFlow,
    PasscodeSetupFlow,
    useDeepLinks,
    useOnboardingFlow
} from '../features';

export const WelcomeScreen: FC = () => {
    const t = useTranslate();
    const onboarding = useOnboardingFlow();
    const { openURL } = useLinking();
    const legal = useBootConfig().references.legal;

    useTrackOnboardingOpen();

    const [importLink, setImportLink] = useState<ImportFlameDevnetLink | null>(null);
    useDeepLinks(target => {
        if (target.kind === 'importFlameDevnetWallet') {
            setImportLink(target);
        }
    }, onboarding.step === null);

    useEffect(() => {
        if (onboarding.step !== null) {
            setImportLink(null);
        }
    }, [onboarding.step]);

    return (
        <>
            <WelcomePage
                onCreateWallet={onboarding.startCreate}
                onImportWallet={onboarding.openImport}
                onConnectLedger={onboarding.openLedger}
                onWatchAccount={onboarding.openWatch}
                onLinkWithQr={() => void onboarding.startSignIn()}
                onOpenTerms={() => openURL(legal.terms_url)}
                onOpenPrivacy={() => openURL(legal.privacy_url)}
            />

            {onboarding.step === null && importLink !== null && (
                <ImportFlameDevnetWalletModal
                    testseed={importLink.testseed}
                    walletName={importLink.walletName}
                    flow={{
                        kind: 'onboarding',
                        onCreateAccount: (mnemonic, walletName) => {
                            setImportLink(null);
                            onboarding.startFlameDevnet(mnemonic, walletName);
                        }
                    }}
                    hasBackdrop={false}
                    onClose={() => setImportLink(null)}
                />
            )}

            {onboarding.step === 'import' && (
                <ImportWalletModal
                    hasBackdrop={false}
                    onSubmit={onboarding.onMnemonicReady}
                    onBack={onboarding.close}
                />
            )}

            {onboarding.step === 'watch' && (
                <WatchAccountModal
                    hasBackdrop={false}
                    onSubmit={onboarding.onWatchInputReady}
                    onBack={onboarding.close}
                />
            )}

            {onboarding.step === 'ledger' && (
                <LedgerModals flow={onboarding.ledger} hasBackdrop={false} />
            )}

            {onboarding.step === 'signIn' && onboarding.connectionString !== undefined && (
                <SignInCard
                    connectionString={onboarding.connectionString}
                    onBack={onboarding.close}
                />
            )}

            {onboarding.step === 'signInSuccess' && (
                <SignInSuccessCard
                    inviterIkPubHex={onboarding.inviterIkPubHex}
                    onContinue={onboarding.onSignInSuccessContinue}
                />
            )}

            {onboarding.step === 'passcode' && (
                <PasscodeSetupFlow
                    Screen={PasscodeCard}
                    create={{
                        title: t('onboarding.passcode.title'),
                        description: t('onboarding.passcode.description')
                    }}
                    confirm={{
                        title: t('onboarding.passcode.reenter.title'),
                        description: t('onboarding.passcode.reenter.description')
                    }}
                    onConfirmed={passcode =>
                        void onboarding.onPasscodeComplete(passcode).catch(() => undefined)
                    }
                    onCancel={onboarding.goBackFromPasscode}
                />
            )}

            {onboarding.step === 'biometry' && (
                <EnableBiometryFlow Screen={BiometryCard} onDone={onboarding.onBiometryFinished} />
            )}
        </>
    );
};
