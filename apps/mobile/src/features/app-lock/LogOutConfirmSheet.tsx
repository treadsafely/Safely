import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useEraseAllData } from '@safely/ux';

import { BottomSheet, DestructiveConfirm } from '@mobile/shared/ui';

type LogOutConfirmSheetProps = {
    onClose: () => void;
};

export const LogOutConfirmSheet = ({ onClose }: LogOutConfirmSheetProps) => {
    const { t } = useTranslation();
    const { mutateAsync: eraseAllData } = useEraseAllData();

    return (
        <View style={StyleSheet.absoluteFill}>
            <BottomSheet onClose={onClose}>
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
    );
};
