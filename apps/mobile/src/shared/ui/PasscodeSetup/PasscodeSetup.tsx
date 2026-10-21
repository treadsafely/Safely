import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { assertUnreachable } from '@safely/core';
import { PASSCODE_LENGTH, useSubmitWhenComplete } from '@safely/ux';

import { PasscodeView } from '@mobile/shared/ui/PasscodeView';
import { Screen } from '@mobile/shared/ui/Screen';
import { Text } from '@mobile/shared/ui/Text';

import { usePasscodeState } from './usePasscodeState';

export type PasscodeSetupHeaderType = 'back' | 'close' | 'placeholder';

type PasscodeSetupProps = {
    headerType: PasscodeSetupHeaderType;
    title: string;
    reenterTitle: string;
    description?: string;
    reenterDescription?: string;
    onComplete: (passcode: string) => void | Promise<void>;
};

const PasscodeSetupHeaderButton = ({ type }: { type: PasscodeSetupHeaderType }) => {
    switch (type) {
        case 'back':
            return <Screen.Header.BackButton />;
        case 'close':
            return <Screen.Header.CloseButton />;
        case 'placeholder':
            return <Screen.Header.ButtonPlaceholder />;
        default:
            return assertUnreachable(type);
    }
};

export const PasscodeSetup = ({
    headerType,
    title,
    reenterTitle,
    description,
    reenterDescription,
    onComplete
}: PasscodeSetupProps) => {
    const { t } = useTranslation();

    const passcodeState = usePasscodeState();
    const [firstPasscode, setFirstPasscode] = useState<string | null>(null);

    const isReenterStep = firstPasscode !== null;

    const handlePasscodeComplete = useCallback(async () => {
        if (passcodeState.isSuccess.value) return;

        if (!isReenterStep) {
            setTimeout(() => {
                setFirstPasscode(passcodeState.inputValue);
                passcodeState.reset();
            }, 300);
        } else {
            if (passcodeState.inputValue === firstPasscode) {
                await notificationAsync(NotificationFeedbackType.Success);
                passcodeState.isSuccess.value = true;

                const inputValue = passcodeState.inputValue;
                setTimeout(async () => {
                    try {
                        await onComplete(inputValue);
                    } catch {
                        passcodeState.reset();
                        setFirstPasscode(null);
                    }
                }, 300);
            } else {
                await notificationAsync(NotificationFeedbackType.Error);
                passcodeState.isError.value = true;

                setTimeout(() => {
                    passcodeState.reset();
                }, 300);
            }
        }
    }, [passcodeState, isReenterStep, firstPasscode, onComplete]);

    useSubmitWhenComplete({
        value: passcodeState.inputValue,
        length: passcodeState.digitsAmount,
        onComplete: () => void handlePasscodeComplete()
    });

    const currentTitle = isReenterStep ? reenterTitle : title;
    const currentDescription = isReenterStep ? reenterDescription : description;

    return (
        <Screen>
            <Screen.Header variant="left">
                <PasscodeSetupHeaderButton type={headerType} />

                {!isReenterStep && (
                    <Screen.Header.Button type="small" onPress={passcodeState.switchDigitsAmount}>
                        <Text variant="labelM" color="primary">
                            {passcodeState.digitsAmount === PASSCODE_LENGTH.short
                                ? t('passcode.switchToSix')
                                : t('passcode.switchToFour')}
                        </Text>
                    </Screen.Header.Button>
                )}
            </Screen.Header>

            <PasscodeView
                title={currentTitle}
                description={currentDescription}
                numberOfDigits={passcodeState.digitsAmount}
                value={passcodeState.inputValue}
                onChange={passcodeState.setInputValue}
                isSuccess={passcodeState.isSuccess}
                isError={passcodeState.isError}
            />
        </Screen>
    );
};
