import { useNavigation } from '@react-navigation/core';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { useClearDismissedBannerIds, useIsDevVersion } from '@safely/ux';

import { useMobileLayerSynchronousGlobalStorage } from '@mobile/shared/storage';
import { Cell, List, Screen, Switch, Text } from '@mobile/shared/ui';

import { styles } from './DevToolsScreen.styles';

export const DevToolsScreen = () => {
    const { t } = useTranslation();
    const isDevVersion = useIsDevVersion();
    const navigation = useNavigation();
    const { mutate: clearDismissedBannerIds } = useClearDismissedBannerIds();
    const { value: devIsTestnetAllowed, set: setDevIsTestnetAllowed } =
        useMobileLayerSynchronousGlobalStorage('devIsTestnetAllowed');

    const handleOpenLogs = useCallback(() => {
        Alert.alert(t('logs.warning.title'), t('logs.warning.message'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('logs.warning.confirm'),
                style: 'destructive',
                onPress: () =>
                    navigation.navigate('SettingsModal', {
                        screen: 'DevToolsLogsModal'
                    })
            }
        ]);
    }, [navigation, t]);

    const handleClearDismissedBannerIds = useCallback(() => {
        void clearDismissedBannerIds();
    }, [clearDismissedBannerIds]);

    const handleTestnetToggle = useCallback(() => {
        setDevIsTestnetAllowed(!devIsTestnetAllowed);
    }, [devIsTestnetAllowed, setDevIsTestnetAllowed]);

    return (
        <Screen>
            <Screen.Header variant="center">
                <Screen.Header.BackButton />
                <Screen.Header.Title>
                    <Text variant="titleS">Dev tools</Text>
                </Screen.Header.Title>
            </Screen.Header>

            <Screen.Content style={styles.content}>
                <List>
                    <List.Group variant="divided">
                        <Cell
                            onPress={() =>
                                navigation.navigate('SettingsModal', {
                                    screen: 'DevToolsXpubModal'
                                })
                            }
                        >
                            <Cell.Content>
                                <Cell.Row>
                                    <Cell.Title>Xpub</Cell.Title>
                                </Cell.Row>
                            </Cell.Content>
                            <Cell.Chevron />
                        </Cell>
                        <Cell onPress={handleOpenLogs}>
                            <Cell.Content>
                                <Cell.Row>
                                    <Cell.Title>Logs</Cell.Title>
                                </Cell.Row>
                            </Cell.Content>
                            <Cell.Chevron />
                        </Cell>
                        <Cell
                            onPress={() =>
                                navigation.navigate('SettingsModal', {
                                    screen: 'DevToolsSyncStorageModal'
                                })
                            }
                        >
                            <Cell.Content>
                                <Cell.Row>
                                    <Cell.Title>Sync Storage</Cell.Title>
                                </Cell.Row>
                            </Cell.Content>
                            <Cell.Chevron />
                        </Cell>
                        {isDevVersion && (
                            <Cell
                                onPress={() =>
                                    navigation.navigate('SettingsModal', {
                                        screen: 'DevToolsConfigModal'
                                    })
                                }
                            >
                                <Cell.Content>
                                    <Cell.Row>
                                        <Cell.Title>Dev config</Cell.Title>
                                    </Cell.Row>
                                </Cell.Content>
                                <Cell.Chevron />
                            </Cell>
                        )}
                    </List.Group>
                    <List.Group variant="divided">
                        <Cell>
                            <Cell.Content>
                                <Cell.Row>
                                    <Cell.Title>Testnet</Cell.Title>
                                </Cell.Row>
                                <Cell.Row>
                                    <Cell.Subtitle numberOfLines={0}>
                                        Allow adding wallets on the test network for development
                                        purposes.
                                    </Cell.Subtitle>
                                </Cell.Row>
                            </Cell.Content>
                            <Switch value={!!devIsTestnetAllowed} onPress={handleTestnetToggle} />
                        </Cell>
                    </List.Group>
                    <List.Group variant="divided">
                        <Cell onPress={handleClearDismissedBannerIds}>
                            <Cell.Content>
                                <Cell.Row>
                                    <Cell.Title>Clear dismissed banners</Cell.Title>
                                </Cell.Row>
                            </Cell.Content>
                            <Cell.Chevron />
                        </Cell>
                    </List.Group>
                </List>
            </Screen.Content>
        </Screen>
    );
};
