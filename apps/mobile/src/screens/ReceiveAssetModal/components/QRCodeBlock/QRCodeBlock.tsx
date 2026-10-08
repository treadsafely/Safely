import { useNavigation } from '@react-navigation/core';
import { type ReactNode, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import QRCode from 'react-native-qrcode-skia';

import { TEST_ID } from '@mobile/shared/constants';
import { Badge, Text, TouchableOpacity } from '@mobile/shared/ui';

import { ReceiveCopyToast, useReceiveCopy } from '../ReceiveCopyToastProvider';
import { styles } from './QRCodeBlock.styles';

type QRCodeBlockProps = {
    address: string;
    logo: ReactNode;
    isWatchOnly: boolean;
    isTestnet: boolean;
    addressLines?: number;
};

export const QRCodeBlock = (props: QRCodeBlockProps) => {
    const { address, logo, isWatchOnly, isTestnet, addressLines } = props;
    const copy = useReceiveCopy();
    const { t } = useTranslation();
    const navigation = useNavigation();

    const handleCopyAddress = useCallback(() => {
        copy(address);
    }, [copy, address]);

    const handleWatchOnlyPress = useCallback(() => {
        navigation.navigate('WatchOnlySheet');
    }, [navigation]);

    return (
        <View style={styles.content}>
            <View style={styles.qrCodeContainer}>
                <QRCode
                    shapeOptions={{
                        shape: 'square',
                        eyePatternShape: 'square'
                    }}
                    logoAreaSize={66}
                    logo={logo}
                    value={address}
                    size={198}
                />
                <ReceiveCopyToast />
            </View>
            <TouchableOpacity onPress={handleCopyAddress}>
                <Text
                    testID={TEST_ID.receive.address}
                    textAlign="center"
                    style={styles.address}
                    variant="bodyLMono"
                    color="constantBlack"
                    numberOfLines={addressLines}
                    ellipsizeMode="middle"
                >
                    {address}
                </Text>
            </TouchableOpacity>
            {isWatchOnly && (
                <Pressable style={styles.badgeContainer} onPress={handleWatchOnlyPress}>
                    <Badge type="warningFilled" isUppercase>
                        {t('portfolio.watchOnly')}
                    </Badge>
                </Pressable>
            )}
            {isTestnet && (
                <View style={styles.badgeContainer}>
                    <Badge type="warningFilled" isUppercase>
                        {t('portfolio.testnet')}
                    </Badge>
                </View>
            )}
        </View>
    );
};
