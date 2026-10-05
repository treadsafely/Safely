import { useCallback } from 'react';
import { FlatList, type ListRenderItem, View } from 'react-native';

import { type LogRecord, shareLogs } from '@mobile/shared/logger';
import { Button, Screen, Text } from '@mobile/shared/ui';

import { LogFilters, LogRow } from './components';
import { styles } from './DevToolsLogsScreen.styles';
import { useLogFilters, useLogs } from './hooks';
import { CapturePreventionView } from '../../../modules/safely-capture-prevention/src';

export const DevToolsLogsScreen = () => {
    const { data, isLoading, refetch } = useLogs();
    const { filtered, filterProps } = useLogFilters(data ?? []);

    const renderItem = useCallback<ListRenderItem<LogRecord>>(
        ({ item }) => <LogRow record={item} />,
        []
    );

    return (
        <Screen>
            <Screen.Header variant="center">
                <Screen.Header.BackButton />
                <Screen.Header.Title>
                    <Text variant="titleS">Logs</Text>
                </Screen.Header.Title>
            </Screen.Header>
            <CapturePreventionView style={styles.captureScreen}>
                <View style={styles.content}>
                    <LogFilters {...filterProps} />

                    <FlatList
                        style={styles.list}
                        contentContainerStyle={styles.listContent}
                        data={filtered}
                        keyExtractor={(item, index) => `${item.timestamp}_${index}`}
                        renderItem={renderItem}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text variant="bodyM" color="secondary">
                                    {isLoading ? 'Loading…' : 'No logs'}
                                </Text>
                            </View>
                        }
                    />

                    <View style={styles.footer}>
                        <Button
                            style={styles.footerButton}
                            type="secondary"
                            onPress={() => void refetch()}
                        >
                            Refresh
                        </Button>
                        <Button
                            type="primary"
                            style={styles.footerButton}
                            onPress={() => void shareLogs()}
                        >
                            Share
                        </Button>
                    </View>
                </View>
            </CapturePreventionView>
        </Screen>
    );
};
