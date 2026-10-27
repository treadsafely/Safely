import { useNavigation } from '@react-navigation/core';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useNumberFormatter, useSendChains } from '@safely/ux';

import { Icon, InformationCircle12 } from '@mobile/shared/ui/Icon';
import { Text } from '@mobile/shared/ui/Text';

import { styles } from './AmountStatus.styles';

interface AmountStatusProps {
    isMax: boolean;
    amountError?: string;
    remainingBalance?: string;
}

export const AmountStatus = (props: AmountStatusProps) => {
    const { isMax, amountError, remainingBalance } = props;

    const formatter = useNumberFormatter();
    const pendingBalance = useSendChains().btc?.pendingBalance;
    const hasPendingBalance = pendingBalance?.relativeAmount.gt(0);

    const { t } = useTranslation();
    const navigation = useNavigation();

    if (isMax) {
        return (
            <Animated.View entering={FadeIn.duration(100)} exiting={FadeOut.duration(100)}>
                <Text variant="bodyM" color="secondary" monospace>
                    {t('send.maxHint')}
                </Text>
            </Animated.View>
        );
    }

    if (amountError) {
        return (
            <Text variant="bodyM" color="accentRed">
                {t(amountError)}
            </Text>
        );
    }

    const content = (
        <>
            <View style={styles.row}>
                <Text variant="bodyM" color="tertiary" monospace>
                    {t('send.remaining')}{' '}
                </Text>
                <Text variant="bodyM" color="tertiary" monospace>
                    {remainingBalance ?? ' '}
                </Text>
            </View>
            {hasPendingBalance && (
                <View style={styles.row}>
                    <Text variant="bodyM" color="tertiary" monospace>
                        {t('send.pending')}{' '}
                    </Text>
                    <Text variant="bodyM" color="tertiary" monospace>
                        {pendingBalance!.format(formatter)}
                    </Text>
                    <View style={styles.infoIcon}>
                        <Icon icon={InformationCircle12} color="tertiary" />
                    </View>
                </View>
            )}
        </>
    );

    if (hasPendingBalance) {
        return (
            <Pressable onPress={() => navigation.navigate('PendingFundsSheet')}>
                {content}
            </Pressable>
        );
    } else {
        return <View>{content}</View>;
    }
};
