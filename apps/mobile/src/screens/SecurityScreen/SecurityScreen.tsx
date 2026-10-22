import { useNavigation } from '@react-navigation/core';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useSecurityCheck } from '@safely/ux';

import { useLockScreenQuery, useSetLockScreenEnabled } from '@mobile/entities/security';
import {
    getBiometryTranslationKey,
    useBiometryQuery,
    useSetBiometryEnabled
} from '@mobile/features/biometry';
import { useLogOutAllConfirmation } from '@mobile/features/settings/useLogOutAllConfirmation';
import { Cell, List, Screen, Switch } from '@mobile/shared/ui';
import { ArrowLeft16, Icon } from '@mobile/shared/ui/Icon';

import { styles } from './SecurityScreen.styles';

export const SecurityScreen = () => {
    const { t } = useTranslation();
    const { data: biometry } = useBiometryQuery();
    const { mutateAsync: setBiometryEnabled } = useSetBiometryEnabled();
    const check = useSecurityCheck();
    const navigation = useNavigation();

    const { data: lockScreenEnabled } = useLockScreenQuery();
    const { mutateAsync: setLockScreenEnabled } = useSetLockScreenEnabled();

    const handleBiometryToggle = async () => {
        if (biometry) {
            await check();
            await setBiometryEnabled(!biometry.isEnabled);
        }
    };

    const handleLockScreenToggle = async () => {
        await check();
        await setLockScreenEnabled(!lockScreenEnabled);
    };

    const handleChangePasscode = async () => {
        await check({ title: t('changePasscode.verify.title') });
        navigation.navigate('ChangePasscodeScreen');
    };

    const eraseAllData = useLogOutAllConfirmation();

    return (
        <Screen>
            <Screen.Header variant="center">
                <Screen.Header.Button onPress={navigation.goBack}>
                    <Icon icon={ArrowLeft16} />
                </Screen.Header.Button>
                <Screen.Header.Title>{t('security.title')}</Screen.Header.Title>
                <View style={styles.headerPlaceholder} />
            </Screen.Header>
            <Screen.Scrollable contentContainerStyle={styles.listContent}>
                <View style={styles.container}>
                    <List>
                        <List.Title>{t('security.groups.application.title')}</List.Title>
                        <List.Group variant="divided" style={styles.listGroupMargin}>
                            {biometry && biometry.availableType && (
                                <Cell>
                                    <Cell.Content>
                                        <Cell.Row>
                                            <Cell.Title>
                                                {t(
                                                    `${getBiometryTranslationKey(biometry.availableType)}.title`
                                                )}
                                            </Cell.Title>
                                        </Cell.Row>
                                        <Cell.Row>
                                            <Cell.Subtitle numberOfLines={0}>
                                                {t(
                                                    `${getBiometryTranslationKey(biometry.availableType)}.description`
                                                )}
                                            </Cell.Subtitle>
                                        </Cell.Row>
                                    </Cell.Content>
                                    <Switch
                                        value={biometry.isEnabled}
                                        onPress={handleBiometryToggle}
                                    />
                                </Cell>
                            )}
                            <Cell>
                                <Cell.Content>
                                    <Cell.Row>
                                        <Cell.Title>
                                            {t('security.groups.application.lockScreen.title')}
                                        </Cell.Title>
                                    </Cell.Row>
                                    <Cell.Row>
                                        <Cell.Subtitle numberOfLines={0}>
                                            {t('security.groups.application.lockScreen.subtitle')}
                                        </Cell.Subtitle>
                                    </Cell.Row>
                                </Cell.Content>
                                <Switch
                                    value={lockScreenEnabled}
                                    onPress={handleLockScreenToggle}
                                />
                            </Cell>
                            <Cell onPress={handleChangePasscode}>
                                <Cell.Content>
                                    <Cell.Row>
                                        <Cell.Title>
                                            {t('security.groups.application.changePasscode')}
                                        </Cell.Title>
                                    </Cell.Row>
                                </Cell.Content>
                                <Cell.Chevron />
                            </Cell>
                        </List.Group>
                        <List.Group>
                            <Cell onPress={eraseAllData}>
                                <Cell.Content>
                                    <Cell.Row>
                                        <Cell.Title>
                                            {t('security.groups.application.eraseAndLogout')}
                                        </Cell.Title>
                                    </Cell.Row>
                                </Cell.Content>
                                <Cell.Chevron />
                            </Cell>
                        </List.Group>
                    </List>
                </View>
            </Screen.Scrollable>
        </Screen>
    );
};
