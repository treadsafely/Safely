import type { FC } from 'react';

import { useErrorToast, useToast, useTranslate } from '@safely/ux';

import { PasscodeSetupFlow } from './PasscodeSetupFlow';
import { usePasscode } from './usePasscode';

export type ChangePasscodeFlowProps = {
    onDone: () => void;
};

export const ChangePasscodeFlow: FC<ChangePasscodeFlowProps> = ({ onDone }) => {
    const t = useTranslate();
    const { set: setPasscode } = usePasscode();
    const toast = useToast();
    const errorToast = useErrorToast({});

    const onConfirmed = async (passcode: string): Promise<void> => {
        try {
            await setPasscode(passcode);
            onDone();
            toast(t('changePasscode.changed'));
        } catch (error) {
            errorToast(error);
        }
    };

    return (
        <PasscodeSetupFlow
            create={{ title: t('changePasscode.new.title') }}
            confirm={{ title: t('changePasscode.reenter.title') }}
            onConfirmed={passcode => void onConfirmed(passcode)}
            onCancel={onDone}
        />
    );
};
