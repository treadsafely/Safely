import type { StaticScreenProps } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BottomSheetScreen } from '@mobile/shared/navigation';
import { Button, Checkmark96, Icon, Text, useBottomSheet } from '@mobile/shared/ui';

import { styles } from './DeviceUnarchivedSheet.styles';

type ArchivedFromDeviceName = {
    archivedFromDeviceName: string | null;
};
type DeviceUnarchivedSheetProps = StaticScreenProps<ArchivedFromDeviceName>;

const DeviceUnarchivedContent = ({ archivedFromDeviceName }: ArchivedFromDeviceName) => {
    const { t } = useTranslation();
    const { close } = useBottomSheet();

    return (
        <View style={styles.content}>
            <Icon icon={Checkmark96} />
            <View style={styles.textBox}>
                <Text textAlign="center" variant="titleM">
                    {t('deviceUnarchived.title')}
                </Text>
                <Text textAlign="center" variant="bodyL" color="secondary">
                    {t('deviceUnarchived.subtitle')}
                </Text>
                {archivedFromDeviceName !== null && (
                    <Text textAlign="center" variant="bodyL" color="tertiary">
                        {t('deviceUnarchived.source', { deviceName: archivedFromDeviceName })}
                    </Text>
                )}
            </View>
            <Button style={styles.action} size="large" type="secondary" onPress={close}>
                {t('deviceUnarchived.action')}
            </Button>
        </View>
    );
};

export const DeviceUnarchivedSheet = (props: DeviceUnarchivedSheetProps) => {
    return (
        <BottomSheetScreen shortHeader>
            <DeviceUnarchivedContent {...props.route.params} />
        </BottomSheetScreen>
    );
};
