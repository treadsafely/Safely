import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useAppState, useEraseAllData } from '@safely/ux';

import { usePasscodeVerification } from '@mobile/entities/security';
import { authenticateBiometry, getBiometryIcon, useBiometryQuery } from '@mobile/features/biometry';
import {
    BottomSheet,
    DestructiveConfirm,
    LockoutContent,
    PasscodeView,
    Screen,
    Text
} from '@mobile/shared/ui';

type LockContentProps = {
    onUnlock: () => void;
};

export const LockContent = ({ onUnlock }: LockContentProps) => {
    const { t } = useTranslation();
    const { current } = useAppState();
    const { data: biometry } = useBiometryQuery();
    const { mutateAsync: eraseAllData } = useEraseAllData();
    const hasPromptedRef = useRef(false);
    const hasUnlockedRef = useRef(false);
    const [isLogOutConfirmVisible, setIsLogOutConfirmVisible] = useState(false);

    const handleUnlock = useCallback(() => {
        if (hasUnlockedRef.current) {
            return;
        }

        hasUnlockedRef.current = true;
        onUnlock();
    }, [onUnlock]);

    useEffect(() => {
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);

        return () => subscription.remove();
    }, []);

    const handleBiometryPress = useCallback(async () => {
        const result = await authenticateBiometry();

        if (result.success) {
            handleUnlock();
        }
    }, [handleUnlock]);

    const {
        inputValue,
        digitsAmount,
        isSuccess,
        isError,
        isLocked,
        remainingSeconds,
        handleInputChange
    } = usePasscodeVerification({ onSuccess: handleUnlock });

    useEffect(() => {
        if (hasPromptedRef.current || isLocked || !biometry?.isEnabled || current !== 'active') {
            return;
        }

        hasPromptedRef.current = true;

        void (async () => {
            const result = await authenticateBiometry();
            if (result.success) {
                handleUnlock();
            }
        })();
    }, [isLocked, biometry?.isEnabled, handleUnlock, current]);

    const logOutConfirm = isLogOutConfirmVisible ? (
        <View style={StyleSheet.absoluteFill}>
            <BottomSheet onClose={() => setIsLogOutConfirmVisible(false)}>
                <DestructiveConfirm
                    title={t('logOutAllAccounts.title')}
                    message={t('logOutAllAccounts.message')}
                    sliderLabel={t('logOutAllAccounts.slider.label')}
                    sliderDescription={t('logOutAllAccounts.slider.description')}
                    cancelLabel={t('logOutAllAccounts.cancel')}
                    onConfirm={eraseAllData}
                />
            </BottomSheet>
        </View>
    ) : null;

    if (isLocked) {
        return (
            <>
                <LockoutContent
                    remainingSeconds={remainingSeconds}
                    onSignOut={() => setIsLogOutConfirmVisible(true)}
                />
                {logOutConfirm}
            </>
        );
    }

    return (
        <>
            <Screen>
                <Screen.Header variant="left">
                    <Screen.Header.Title />
                    <Screen.Header.Button
                        type="small"
                        onPress={() => setIsLogOutConfirmVisible(true)}
                    >
                        <Text variant="labelM" color="primary">
                            {t('passcode.lockout.signOut')}
                        </Text>
                    </Screen.Header.Button>
                </Screen.Header>

                <PasscodeView
                    title={t('lockScreen.title')}
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
