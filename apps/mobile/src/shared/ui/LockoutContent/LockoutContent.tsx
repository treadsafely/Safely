import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { lockoutRemainingCopy } from '@safely/ux';

import { Icon, Lock56 } from '../Icon';
import { Screen } from '../Screen';
import { Text } from '../Text';
import { styles } from './LockoutContent.styles';

interface LockoutContentProps {
    remainingSeconds: number;
    onSignOut: () => void;
}

export const LockoutContent = (props: LockoutContentProps) => {
    const { remainingSeconds, onSignOut } = props;
    const { t } = useTranslation();

    const remaining = lockoutRemainingCopy(remainingSeconds);

    return (
        <Screen>
            <Screen.Header variant="left">
                <Screen.Header.Title />
                <Screen.Header.Button type="small" onPress={onSignOut}>
                    <Text variant="labelM" color="primary">
                        {t('passcode.lockout.signOut')}
                    </Text>
                </Screen.Header.Button>
            </Screen.Header>

            <View style={styles.content}>
                <Icon icon={Lock56} color="tertiary" />

                <View style={styles.textContainer}>
                    <Text textAlign="center" variant="titleM">
                        {t('passcode.lockout.title')}
                    </Text>
                    <Text textAlign="center" variant="bodyL" color="secondary">
                        {t(remaining.translationKey, { count: remaining.count })}
                    </Text>
                </View>
            </View>
        </Screen>
    );
};
