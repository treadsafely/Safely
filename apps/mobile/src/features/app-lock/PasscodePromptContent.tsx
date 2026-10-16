import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';

import { usePasscodeLockout, usePasscodeVerification } from '@mobile/entities/security';
import { authenticateBiometry, getBiometryIcon, useBiometryQuery } from '@mobile/features/biometry';
import { TEST_ID } from '@mobile/shared/constants';
import { LockoutContent, PasscodeView, Screen, Text } from '@mobile/shared/ui';

import { LogOutConfirmSheet } from './LogOutConfirmSheet';

type PasscodePromptContentProps = {
    title?: string;
    subtitle?: string;
    onVerified: () => void;
    onCancel: () => void;
};

export const PasscodePromptContent = (props: PasscodePromptContentProps) => {
    const { title, subtitle, onVerified, onCancel } = props;

    const { t } = useTranslation();
    const { data: biometry } = useBiometryQuery();
    const { hasLockedOut, resetAttempts } = usePasscodeLockout();
    const [isLogOutConfirmVisible, setIsLogOutConfirmVisible] = useState(false);

    const {
        inputValue,
        digitsAmount,
        isSuccess,
        isError,
        isLocked,
        remainingSeconds,
        handleInputChange
    } = usePasscodeVerification({ onSuccess: onVerified });

    const handleBiometryPress = useCallback(async () => {
        const result = await authenticateBiometry();

        if (result.success) {
            await resetAttempts();
            onVerified();
        }
    }, [resetAttempts, onVerified]);

    useEffect(() => {
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            if (!hasLockedOut) {
                onCancel();
            }

            return true;
        });

        return () => subscription.remove();
    }, [hasLockedOut, onCancel]);

    const showLogOutConfirm = () => setIsLogOutConfirmVisible(true);

    const logOutConfirm = isLogOutConfirmVisible ? (
        <LogOutConfirmSheet onClose={() => setIsLogOutConfirmVisible(false)} />
    ) : null;

    if (isLocked) {
        return (
            <>
                <LockoutContent remainingSeconds={remainingSeconds} onSignOut={showLogOutConfirm} />
                {logOutConfirm}
            </>
        );
    }

    return (
        <>
            <Screen>
                <Screen.Header variant="left">
                    <Screen.Header.Title />
                    {hasLockedOut ? (
                        <Screen.Header.Button type="small" onPress={showLogOutConfirm}>
                            <Text variant="labelM" color="primary">
                                {t('passcode.lockout.signOut')}
                            </Text>
                        </Screen.Header.Button>
                    ) : (
                        <Screen.Header.CloseButton onPress={onCancel} />
                    )}
                </Screen.Header>

                <PasscodeView
                    testID={TEST_ID.passcodeVerification.screen}
                    title={title ?? t('passcode.verify.title')}
                    description={subtitle}
                    numberOfDigits={digitsAmount}
                    value={inputValue}
                    onChange={handleInputChange}
                    isSuccess={isSuccess}
                    isError={isError}
                    biometry={
                        biometry?.isEnabled
                            ? {
                                  onPress: handleBiometryPress,
                                  icon: getBiometryIcon(biometry.availableType)
                              }
                            : undefined
                    }
                />
            </Screen>
            {logOutConfirm}
        </>
    );
};
