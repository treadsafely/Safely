import { useNativeState } from '@expo/ui/jetpack-compose';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { runOnJS } from 'react-native-worklets';

import { useAppContext, useImportSeedPhrase } from '@safely/ux';

import { TEST_ID } from '@mobile/shared/constants';
import { Button, NativeInput, Screen, Text, type NativeInputRef } from '@mobile/shared/ui';
import { maskSeedPhraseInput } from '@mobile/shared/utils';

import { styles } from './SeedPhraseImportForm.styles';
import { CapturePreventionView } from '../../../../modules/safely-capture-prevention/src';

type SeedPhraseImportFormProps = {
    onMnemonicReady: (mnemonic: string[]) => void;
};

export const SeedPhraseImportForm = ({ onMnemonicReady }: SeedPhraseImportFormProps) => {
    const { t } = useTranslation();
    const { logger } = useAppContext();

    const { value, error, isDirty, onChange, handleSubmit } = useImportSeedPhrase({
        onSubmit: onMnemonicReady
    });

    const text = useNativeState(value);
    const selection = useNativeState({ start: 0, end: 0 });

    const handleChangeText = useCallback(
        (newValue: string) => {
            'worklet';
            const masked = maskSeedPhraseInput(newValue, selection.value);
            text.value = masked.value;
            if (masked.changed) {
                selection.value = masked.selection;
            }
            runOnJS(onChange)(masked.value);
        },
        [text, selection, onChange]
    );

    const inputRef = useRef<NativeInputRef>(null);

    useFocusEffect(
        useCallback(() => {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 400);

            return () => clearTimeout(timer);
        }, [])
    );

    const handleContinue = useCallback(() => {
        handleSubmit();
    }, [handleSubmit]);

    return (
        <Screen>
            <Screen.Header variant="left">
                <Screen.Header.BackButton />
                <Button
                    testID={TEST_ID.importWallet.continueButton}
                    type="primary"
                    size="small"
                    style={styles.continueButton}
                    onPress={handleContinue}
                    disabled={!isDirty}
                >
                    {t('common.continue')}
                </Button>
            </Screen.Header>
            <Screen.Content>
                <CapturePreventionView
                    style={styles.captureScreen}
                    onUnsupported={() =>
                        logger.error('[SeedPhraseImportForm] capture protection unavailable')
                    }
                >
                    <View style={styles.content}>
                        <View style={styles.textContainer}>
                            <Text variant="titleM" textAlign="center">
                                {t('onboarding.importWallet.title')}
                            </Text>
                            <Text variant="bodyL" color="secondary" textAlign="center">
                                {t('onboarding.importWallet.description')}
                            </Text>
                        </View>
                        <NativeInput
                            ref={inputRef}
                            value={text}
                            selection={selection}
                            onChangeText={handleChangeText}
                            error={!!error}
                            placeholder={t('onboarding.importWallet.placeholder')}
                            multiline
                            sensitive
                        />
                        {error && (
                            <Text
                                testID={TEST_ID.importWallet.error}
                                variant="bodyM"
                                color="accentRed"
                            >
                                {error}
                            </Text>
                        )}
                    </View>
                </CapturePreventionView>
            </Screen.Content>
        </Screen>
    );
};
