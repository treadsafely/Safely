import { useNavigation } from '@react-navigation/core';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { usePasscode } from '@mobile/entities/security';
import { PasscodeSetup } from '@mobile/shared/ui';

export const ChangePasscodeScreen = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const { set: setPasscode } = usePasscode();

    const handleComplete = useCallback(
        async (newPasscode: string) => {
            await setPasscode(newPasscode);
            navigation.goBack();
        },
        [setPasscode, navigation]
    );

    return (
        <PasscodeSetup
            headerType="close"
            title={t('changePasscode.new.title')}
            reenterTitle={t('changePasscode.reenter.title')}
            onComplete={handleComplete}
        />
    );
};
