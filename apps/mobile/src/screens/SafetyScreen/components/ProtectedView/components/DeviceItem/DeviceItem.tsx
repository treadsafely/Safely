import { useNavigation } from '@react-navigation/core';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { SyncedDeviceDetails, SyncedDeviceStatusTone } from '@safely/ux';
import { resolveDeviceRowStatus, useDateFormatter } from '@safely/ux';

import type { TextProps } from '@mobile/shared/ui';
import { Badge, ChevronRight16, Icon, Text, TouchableOpacity } from '@mobile/shared/ui';

import { styles } from './DeviceItem.styles';

const COLOR_BY_TONE: Record<SyncedDeviceStatusTone, TextProps['color']> = {
    secondary: 'secondary',
    red: 'accentRed',
    orange: 'accentOrange'
};

export const DeviceItem = ({ device }: { device: SyncedDeviceDetails }) => {
    const { t } = useTranslation();
    const rootNavigation = useNavigation();
    const formatDate = useDateFormatter({ month: 'short', day: 'numeric', year: 'numeric' });
    const status = resolveDeviceRowStatus(device);

    const handlePress = () => {
        rootNavigation.navigate('DeviceDetailsScreen', { ikPubHex: device.ikPubHex });
    };

    return (
        <TouchableOpacity style={styles.row} onPress={handlePress}>
            <View style={styles.info}>
                <View style={styles.nameRow}>
                    <Text variant="labelL">{device.meta.name}</Text>
                    {device.isCurrent && <Badge isUppercase>{t('security.device.current')}</Badge>}
                </View>
                <Text variant="bodyM" color={COLOR_BY_TONE[status.tone]}>
                    {t(status.labelKey, {
                        date: device.archive
                            ? formatDate.format(device.archive.archivedAt)
                            : undefined
                    })}
                </Text>
                <Text variant="bodyM" color="tertiary">
                    {t('security.device.added', { date: formatDate.format(device.meta.pairedAt) })}
                </Text>
            </View>
            <Icon icon={ChevronRight16} color="tertiary" />
        </TouchableOpacity>
    );
};
