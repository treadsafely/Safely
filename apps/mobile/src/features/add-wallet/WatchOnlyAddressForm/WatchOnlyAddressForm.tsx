import { useNavigation } from '@react-navigation/core';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, View } from 'react-native';

import type { PortfolioNetworkType } from '@safely/core';
import { BtcAddress, BtcXpub, PortfolioWatchOnlyBtc } from '@safely/core';

import { TEST_ID } from '@mobile/shared/constants';
import { Button, Input, Screen, Text } from '@mobile/shared/ui';
import { useAutoFocus } from '@mobile/shared/utils';

import { styles } from './WatchOnlyAddressForm.styles';

type WatchOnlyAddressFormProps = {
    networkType: PortfolioNetworkType;
    onSubmit: (input: string) => void;
};

export const WatchOnlyAddressForm = ({ networkType, onSubmit }: WatchOnlyAddressFormProps) => {
    const { t } = useTranslation();
    const navigation = useNavigation();

    const inputRef = useAutoFocus();
    const [address, setAddress] = useState('');

    const trimmedInput = address.trim();
    const isValidAddress = BtcAddress.validate(trimmedInput);
    const isValidPubkey = BtcXpub.validate(trimmedInput);
    const isValidSupportedPubkey = isValidPubkey && /^[XxZz]pub/.test(trimmedInput);

    const isPolicylessXpub = isValidSupportedPubkey && /^[Xx]pub/.test(trimmedInput);

    const pubkeyAddress = useMemo(() => {
        if (!isValidSupportedPubkey) {
            return null;
        }

        try {
            return PortfolioWatchOnlyBtc.deriveAddress(trimmedInput, networkType);
        } catch {
            return null;
        }
    }, [isValidSupportedPubkey, trimmedInput, networkType]);

    const isValidInput = isValidAddress || pubkeyAddress !== null;
    const displayError = !isValidInput && trimmedInput.length >= 20;

    const handleNext = useCallback(() => {
        if (pubkeyAddress && isPolicylessXpub) {
            Keyboard.dismiss();
            navigation.navigate('ConfirmXpubImportSheet', {
                address: pubkeyAddress,
                onConfirm: () => onSubmit(trimmedInput)
            });

            return;
        }

        onSubmit(trimmedInput);
    }, [navigation, onSubmit, pubkeyAddress, isPolicylessXpub, trimmedInput]);

    return (
        <Screen>
            <Screen.Header variant="left">
                <Screen.Header.BackButton />
                <Button
                    testID={TEST_ID.watchOnly.continueButton}
                    type="primary"
                    size="small"
                    style={styles.nextButton}
                    onPress={handleNext}
                    disabled={!isValidInput}
                >
                    {t('common.continue')}
                </Button>
            </Screen.Header>
            <Screen>
                <View style={styles.textContainer}>
                    <Text variant="titleM" textAlign="center">
                        {t('addWallet.watchAccount.title')}
                    </Text>
                    <Text variant="bodyL" color="secondary" textAlign="center">
                        {t('addWallet.watchAccount.subtitle')}
                    </Text>
                </View>

                <Input style={styles.inputWrapper}>
                    <Input.Field
                        testID={TEST_ID.watchOnly.addressInput}
                        ref={inputRef}
                        value={address}
                        onChangeText={setAddress}
                        errored={displayError}
                        withClearButton
                        multiline
                        submitBehavior="submit"
                        returnKeyType="next"
                        onSubmitEditing={isValidInput ? handleNext : undefined}
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        placeholder={t('addWallet.watchAccount.placeholder')}
                    />
                    {displayError && (
                        <Input.Description color="accentRed">
                            {t(
                                isValidPubkey
                                    ? 'addWallet.watchAccount.unsupportedExtendedKey'
                                    : 'addWallet.watchAccount.invalidAddress'
                            )}
                        </Input.Description>
                    )}
                </Input>

                <View style={styles.infoBox}>
                    <Text variant="bodyM" color="secondary">
                        {t('addWallet.watchAccount.info')}
                    </Text>
                </View>
            </Screen>
        </Screen>
    );
};
