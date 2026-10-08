import { useNavigation } from '@react-navigation/core';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useEraseAllData } from '@safely/ux';

export function useLogOutAllConfirmation() {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const { mutateAsync: eraseAllData } = useEraseAllData();

    return useCallback(() => {
        navigation.navigate('DestructiveConfirmSheet', {
            title: t('logOutAllAccounts.title'),
            message: t('logOutAllAccounts.message'),
            sliderLabel: t('logOutAllAccounts.slider.label'),
            sliderDescription: t('logOutAllAccounts.slider.description'),
            cancelLabel: t('logOutAllAccounts.cancel'),
            onConfirm: async () => {
                await eraseAllData();
            }
        });
    }, [eraseAllData, navigation, t]);
}
