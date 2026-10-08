import type { FC } from 'react';
import { useState } from 'react';

import {
    SecurityCheckCancelledError,
    useErrorToast,
    useSecurityCheck,
    useTranslate
} from '@safely/ux';
import { SecuritySettings } from '@safely/web-ui';

import { useLockScreen } from '../app-lock';
import { useBiometryQuery, useSetBiometryEnabled } from '../biometry';
import { ChangePasscodeFlow } from '../passcode';

export const SecuritySection: FC = () => {
    const t = useTranslate();
    const errorToast = useErrorToast({});
    const check = useSecurityCheck();

    const lockScreen = useLockScreen();
    const { data: biometry } = useBiometryQuery();
    const { mutate: setBiometryEnabled } = useSetBiometryEnabled();

    const [isChangingPasscode, setIsChangingPasscode] = useState(false);

    const guarded = async (title: string, run: () => Promise<void> | void): Promise<void> => {
        try {
            await check({ title });
            await run();
        } catch (error) {
            if (!(error instanceof SecurityCheckCancelledError)) {
                errorToast(error);
            }
        }
    };

    return (
        <>
            <SecuritySettings
                isLockScreenEnabled={lockScreen.isEnabled}
                biometry={
                    biometry?.isAvailable
                        ? {
                              title: t('biometry.fingerprint.ios.title'),
                              description: t('biometry.fingerprint.ios.description'),
                              isEnabled: biometry.isEnabled,
                              onToggle: isEnabled =>
                                  void guarded(t('passcode.verify.title'), () =>
                                      setBiometryEnabled(isEnabled)
                                  )
                          }
                        : undefined
                }
                onToggleLockScreen={isEnabled =>
                    void guarded(t('passcode.verify.title'), () => lockScreen.setEnabled(isEnabled))
                }
                onChangePasscode={() =>
                    void guarded(t('changePasscode.verify.title'), () =>
                        setIsChangingPasscode(true)
                    )
                }
            />

            {isChangingPasscode && (
                <ChangePasscodeFlow onDone={() => setIsChangingPasscode(false)} />
            )}
        </>
    );
};
