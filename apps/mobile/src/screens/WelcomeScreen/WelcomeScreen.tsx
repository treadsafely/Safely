import { useNavigation } from '@react-navigation/core';
import { useCallback, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ImageBackground, View } from 'react-native';

import {
    useAppContext,
    useBootConfig,
    useCreateExistingAccountConnector,
    useHasAccount,
    useLinking,
    useTrackOnboardingOpen
} from '@safely/ux';

import { usePasscode } from '@mobile/entities/security';
import { useOnboardingFlow } from '@mobile/features/onboarding';
import { TEST_ID } from '@mobile/shared/constants';
import { resources } from '@mobile/shared/resources';
import { Button, Icon, QrCodeScanShield28, Safely96, Screen, Text } from '@mobile/shared/ui';

import { styles } from './WelcomeScreen.styles';

export const WelcomeScreen = () => {
    const { t } = useTranslation();
    const hasAccount = useHasAccount();
    const { isSet: hasPasscode } = usePasscode();
    const hasExistingAccountOnOpen = useRef(hasAccount && hasPasscode).current;

    const { onSuccessCreate, onSuccessSignIn } = useOnboardingFlow();
    const signIn = useCreateExistingAccountConnector();
    const navigation = useNavigation();
    const { privacy_url, terms_url } = useBootConfig().references.legal;

    const {
        storage: {
            sync: { getSecureEncrypted }
        }
    } = useAppContext();
    const { openURL } = useLinking();

    useTrackOnboardingOpen();

    const handleSignIn = useCallback(async () => {
        signIn.reset();

        // resource will be closed manually in `closeStorage` because it needs to be opened on the SignInScreen
        const secureEncryptedStorage = getSecureEncrypted();

        // don't ask for the password while setting app initially after first account creation during onboarding to provide smooth user experience
        secureEncryptedStorage.UNSAFE_SKIP_SECURITY_CHECK_unlock();

        const connector = await signIn.mutateAsync({ secureEncryptedStorage });

        navigation.navigate('SignInScreen', {
            connector,
            closeStorage: () => secureEncryptedStorage[Symbol.dispose](),
            onSuccess: (inviterIkPubHex: string | null) =>
                navigation.navigate('SignInSuccessScreen', {
                    inviterIkPubHex,
                    onContinue: onSuccessSignIn
                })
        });
    }, [signIn, navigation, getSecureEncrypted, onSuccessSignIn]);

    if (hasExistingAccountOnOpen) {
        throw new Error('WelcomeScreen opened with an existing account');
    }

    return (
        <Screen background="transparent">
            <Screen.Content>
                <ImageBackground source={resources.welcomeScreenBg} style={styles.background}>
                    <Icon icon={Safely96} style={styles.logo} />

                    <View style={styles.textContainer}>
                        <Text variant="titleM">{t('welcome.title')}</Text>
                        <Text variant="bodyL" color="secondary" textAlign="center">
                            {t('welcome.subtitle')}
                        </Text>
                    </View>

                    <View style={styles.buttonsContainer}>
                        <Button
                            testID={TEST_ID.welcome.createWallet}
                            type="primary"
                            size="large"
                            onPress={onSuccessCreate}
                        >
                            {t('welcome.newWallet')}
                        </Button>
                        <Button
                            testID={TEST_ID.welcome.importWallet}
                            type="secondary"
                            size="large"
                            onPress={() => navigation.navigate('OnboardingImportWalletScreen')}
                        >
                            {t('welcome.importWallet')}
                        </Button>
                        <Button
                            testID={TEST_ID.welcome.moreOptions}
                            type="secondary"
                            size="large"
                            onPress={() => navigation.navigate('MoreOptionsSheet')}
                        >
                            {t('welcome.moreOptions')}
                        </Button>
                        <Button
                            style={styles.lastButton}
                            testID={TEST_ID.welcome.qrSignIn}
                            type="blue"
                            size="large"
                            onPress={handleSignIn}
                        >
                            <View style={styles.buttonTextWithIcon}>
                                <Text variant="labelL" color="link">
                                    {t('welcome.linkWithQr')}
                                </Text>
                                <Icon icon={QrCodeScanShield28} />
                            </View>
                        </Button>
                    </View>

                    <View style={styles.legalContainer}>
                        <Text variant="bodyS" color="tertiary" textAlign="center">
                            <Trans
                                i18nKey="welcome.legal"
                                components={{
                                    terms: (
                                        <Text
                                            variant="bodyS"
                                            color="secondary"
                                            onPress={() => openURL(terms_url)}
                                        />
                                    ),
                                    privacy: (
                                        <Text
                                            variant="bodyS"
                                            color="secondary"
                                            onPress={() => openURL(privacy_url)}
                                        />
                                    )
                                }}
                            />
                        </Text>
                    </View>
                </ImageBackground>
            </Screen.Content>
        </Screen>
    );
};
