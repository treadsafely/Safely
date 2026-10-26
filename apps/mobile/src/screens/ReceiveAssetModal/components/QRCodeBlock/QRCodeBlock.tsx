import { useNavigation } from '@react-navigation/core';
import { type ReactNode, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text as RNText, View } from 'react-native';
import QRCode from 'react-native-qrcode-skia';

import type { PortfolioNetworkBadge } from '@safely/ux';

import { NetworkBadge } from '@mobile/entities/portfolio';
import { TEST_ID } from '@mobile/shared/constants';
import { Badge, Text, TouchableOpacity } from '@mobile/shared/ui';

import { ReceiveCopyToast, useReceiveCopy } from '../ReceiveCopyToastProvider';
import { styles } from './QRCodeBlock.styles';

type QRCodeBlockProps = {
    address: string;
    logo: ReactNode;
    isWatchOnly: boolean;
    networkBadge: PortfolioNetworkBadge | null;
    trackingAddress?: string;
};

export const QRCodeBlock = (props: QRCodeBlockProps) => {
    const { address, logo, isWatchOnly, networkBadge, trackingAddress } = props;
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
                >
                    {trackingAddress && address.startsWith(trackingAddress) ? (
                        <>
                            <RNText style={styles.addressShared}>{trackingAddress}</RNText>
                            <RNText style={styles.addressRest}>
                                {address.slice(trackingAddress.length)}
                            </RNText>
                        </>
                    ) : (
                        address
                    )}
                </Text>
            </TouchableOpacity>
            {isWatchOnly && (
                <Pressable style={styles.badgeContainer} onPress={handleWatchOnlyPress}>
                    <Badge type="warningFilled" isUppercase>
                        {t('portfolio.watchOnly')}
                    </Badge>
                </Pressable>
            )}
            {networkBadge && (
                <View style={styles.badgeContainer}>
                    <NetworkBadge badge={networkBadge} neutralType="warningFilled" />
                </View>
            )}
        </View>
    );
};
