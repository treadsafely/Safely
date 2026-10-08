import type { FC } from 'react';

import { useBootConfig, useLinking, useToast, useTranslate } from '@safely/ux';
import {
    ImportWalletModal,
    MoreOptionsModal,
    SignInModal,
    SignInSuccessModal,
    WatchAccountModal,
    WelcomePage
} from '@safely/web-ui';

import { EnableBiometryFlow, PasscodeSetupFlow, useOnboardingFlow } from '../features';

export const WelcomeScreen: FC = () => {
    const t = useTranslate();
    const toast = useToast();
    const onboarding = useOnboardingFlow();
    const { openURL } = useLinking();
    const legal = useBootConfig().references.legal;

    const notSupported = (): void =>
        toast({ message: t('common.errors.notSupportedYet'), type: 'error' });

    return (
        <>
            <WelcomePage
                onCreateWallet={onboarding.startCreate}
                onImportWallet={onboarding.openImport}
                onMoreOptions={onboarding.openMoreOptions}
                onLinkWithQr={() => void onboarding.startSignIn()}
                onOpenTerms={() => openURL(legal.terms_url)}
                onOpenPrivacy={() => openURL(legal.privacy_url)}
            />

            {onboarding.step === 'moreOptions' && (
                <MoreOptionsModal
                    onWatchAccount={onboarding.openWatch}
                    onConnectLedger={notSupported}
                    onClose={onboarding.close}
                />
            )}

            {onboarding.step === 'import' && (
                <ImportWalletModal
                    onSubmit={onboarding.onMnemonicReady}
                    onClose={onboarding.close}
                />
            )}

            {onboarding.step === 'watch' && (
                <WatchAccountModal
                    onSubmit={onboarding.onWatchInputReady}
                    onClose={onboarding.close}
                />
            )}

            {onboarding.step === 'signIn' && onboarding.connectionString !== undefined && (
                <SignInModal
                    connectionString={onboarding.connectionString}
                    onClose={onboarding.close}
                />
            )}

            {onboarding.step === 'signInSuccess' && (
                <SignInSuccessModal
                    inviterIkPubHex={onboarding.inviterIkPubHex}
                    onContinue={onboarding.onSignInSuccessContinue}
                />
            )}

            {onboarding.step === 'passcode' && (
                <PasscodeSetupFlow
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
                <EnableBiometryFlow onDone={onboarding.onBiometryFinished} />
            )}
        </>
    );
};
