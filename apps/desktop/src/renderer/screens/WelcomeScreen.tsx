import type { FC } from 'react';

import { useBootConfig, useLinking, useTranslate } from '@safely/ux';
import {
    ImportWalletModal,
    SignInModal,
    SignInSuccessModal,
    WatchAccountModal,
    WelcomePage
} from '@safely/web-ui';

import { EnableBiometryFlow, PasscodeSetupFlow, useOnboardingFlow } from '../features';

export const WelcomeScreen: FC = () => {
    const t = useTranslate();
    const onboarding = useOnboardingFlow();
    const { openURL } = useLinking();
    const legal = useBootConfig().references.legal;

    return (
        <>
            <WelcomePage
                onCreateWallet={onboarding.startCreate}
                onImportWallet={onboarding.openImport}
                onWatchAccount={onboarding.openWatch}
                onLinkWithQr={() => void onboarding.startSignIn()}
                onOpenTerms={() => openURL(legal.terms_url)}
                onOpenPrivacy={() => openURL(legal.privacy_url)}
            />

            {onboarding.step === 'import' && (
                <ImportWalletModal
                    appearance="onboarding"
                    onSubmit={onboarding.onMnemonicReady}
                    onClose={onboarding.close}
                />
            )}

            {onboarding.step === 'watch' && (
                <WatchAccountModal
                    appearance="onboarding"
                    onSubmit={onboarding.onWatchInputReady}
                    onClose={onboarding.close}
                />
            )}

            {onboarding.step === 'signIn' && onboarding.connectionString !== undefined && (
                <SignInModal
                    appearance="onboarding"
                    connectionString={onboarding.connectionString}
                    onClose={onboarding.close}
                />
            )}

            {onboarding.step === 'signInSuccess' && (
                <SignInSuccessModal
                    appearance="onboarding"
                    inviterIkPubHex={onboarding.inviterIkPubHex}
                    onContinue={onboarding.onSignInSuccessContinue}
                />
            )}

            {onboarding.step === 'passcode' && (
                <PasscodeSetupFlow
                    appearance="onboarding"
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
                <EnableBiometryFlow
                    appearance="onboarding"
                    onDone={onboarding.onBiometryFinished}
                />
            )}
        </>
    );
};
