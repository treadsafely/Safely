import { useNavigation } from '@react-navigation/core';
import { setStringAsync } from 'expo-clipboard';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeOut,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import { useUnistyles } from 'react-native-unistyles';

import { ellipsisMiddle } from '@safely/core';
import {
    useActivePortfolioWallets,
    useActivePortfolioLedgerIndex,
    useActivePortfolioNetworkBadge,
    useDateFormatter,
    useIsActivePortfolioWatchOnly,
    resolvePortfolioAddresses,
    usePortfolioTotalBalance
} from '@safely/ux';

import { NetworkBadge } from '@mobile/entities/portfolio';
import type { TextProps } from '@mobile/shared/ui';
import { Badge, Text } from '@mobile/shared/ui';

import { SubtitleStatus, useSubtitleStatus } from './useSubtitleStatus';

const AnimatedText = Animated.createAnimatedComponent(Text);

export const SubtitleAnimatedText = ({ children, ...props }: TextProps) => {
    const { theme } = useUnistyles();
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) }),
                withTiming(0, { duration: 650, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );
    }, [progress]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            color: interpolateColor(
                progress.value,
                [0, 1],
                [theme.colors.text.tertiary, theme.colors.text.secondary]
            )
        };
    });

    return (
        <AnimatedText style={animatedStyle} {...props}>
            {children}
        </AnimatedText>
    );
};

export const Subtitle = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const wallets = useActivePortfolioWallets();
    const totalBalance = usePortfolioTotalBalance(wallets);
    const address = resolvePortfolioAddresses(wallets)[0]?.address ?? '';
    const networkBadge = useActivePortfolioNetworkBadge();
    const isWatchOnly = useIsActivePortfolioWatchOnly();
    const ledgerIndex = useActivePortfolioLedgerIndex();
    const lastUpdatedAt = totalBalance.dataUpdatedAt;

    const { status, onCopyAddress } = useSubtitleStatus({
        isFetching: totalBalance.isFetching,
        lastUpdatedAt
    });

    const handleWatchOnlyPress = useCallback(() => {
        navigation.navigate('WatchOnlySheet');
    }, [navigation]);

    const hasChangedRef = useRef(false);

    useEffect(() => {
        return () => {
            hasChangedRef.current = true;
        };
    }, [status]);

    const handleCopyAddress = useCallback(() => {
        setStringAsync(address);
        notificationAsync(NotificationFeedbackType.Success);
        onCopyAddress();
    }, [onCopyAddress, address]);

    const dateFormatter = useDateFormatter({
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });

    const content = useMemo(() => {
        switch (status) {
            case SubtitleStatus.LAST_UPDATED:
                return (
                    <Text variant="bodyL" textAlign="center" color="secondary">
                        {t('home.status.lastUpdated', {
                            lastUpdatedAt: dateFormatter.format(lastUpdatedAt)
                        })}
                    </Text>
                );
            case SubtitleStatus.ADDRESS:
                return (
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6
                        }}
                    >
                        <Text
                            onPress={handleCopyAddress}
                            textAlign="center"
                            variant="bodyL"
                            color="secondary"
                        >
                            {ellipsisMiddle(address, 4)}
                        </Text>
                        {isWatchOnly && (
                            <Pressable onPress={handleWatchOnlyPress}>
                                <Badge type="warning" isUppercase>
                                    {t('portfolio.watchOnly')}
                                </Badge>
                            </Pressable>
                        )}
                        {networkBadge && (
                            <NetworkBadge badge={networkBadge} neutralType="warning" />
                        )}
                        {ledgerIndex !== undefined && (
                            <>
                                <Badge>{String(ledgerIndex + 1)}</Badge>
                                <Badge isUppercase>{t('portfolio.ledger')}</Badge>
                            </>
                        )}
                    </View>
                );
            case SubtitleStatus.ADDRESS_COPIED:
                return (
                    <Text variant="bodyL" textAlign="center" color="secondary">
                        {t('home.status.addressCopied')}
                    </Text>
                );
            case SubtitleStatus.UPDATING:
                return (
                    <SubtitleAnimatedText variant="bodyL" textAlign="center">
                        {t('home.status.updating')}
                    </SubtitleAnimatedText>
                );
            case SubtitleStatus.NO_INTERNET:
                return (
                    <Text variant="bodyL" textAlign="center" color="accentOrange">
                        {t('home.status.noInternet')}
                    </Text>
                );
        }
    }, [
        status,
        t,
        dateFormatter,
        lastUpdatedAt,
        handleCopyAddress,
        address,
        isWatchOnly,
        networkBadge,
        ledgerIndex,
        handleWatchOnlyPress
    ]);

    return (
        <Animated.View
            key={status}
            entering={hasChangedRef.current ? FadeIn.duration(200).delay(220) : undefined}
            exiting={FadeOut.duration(180)}
        >
            {content}
        </Animated.View>
    );
};
