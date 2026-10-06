import { memo, useState } from 'react';
import { View } from 'react-native';

import { LogLevel } from '@safely/sync';
import type { LogRecord } from '@safely/sync';
import { formatLogMessage, logLevelTone, scopeLabel } from '@safely/ux';

import { Text, TouchableOpacity } from '@mobile/shared/ui';
import { useCopy } from '@mobile/shared/utils/copy';

import { styles } from './LogRow.styles';

const COLLAPSED_LINES = 8;
const COLLAPSED_CHARS = 400;

type LogRowProps = {
    record: LogRecord;
};

export const LogRow = memo(({ record }: LogRowProps) => {
    const message = formatLogMessage(record.message);
    const copy = useCopy();
    const [isExpanded, setIsExpanded] = useState(false);

    const isCollapsible =
        message.split('\n').length > COLLAPSED_LINES || message.length > COLLAPSED_CHARS;

    const handleCopy = () =>
        copy(
            `${LogLevel[record.level]} ${record.timestamp} ${scopeLabel(record.path)}\n${message}`
        );

    return (
        <TouchableOpacity style={styles.row} onPress={handleCopy}>
            <View style={styles.rowMeta}>
                <Text variant="labelS" color={logLevelTone(record.level)}>
                    {LogLevel[record.level]}
                </Text>
                <Text variant="bodyS" color="tertiary">
                    {record.timestamp.slice(11, 23)}
                </Text>
                <Text variant="bodyS" color="secondary" numberOfLines={1} style={styles.scope}>
                    {scopeLabel(record.path)}
                </Text>
                {isCollapsible && (
                    <TouchableOpacity
                        style={styles.toggle}
                        hitSlop={24}
                        onPress={() => setIsExpanded(prev => !prev)}
                    >
                        <Text variant="bodyS" color="primary">
                            {isExpanded ? 'Less' : 'More'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
            <Text
                variant="bodyS"
                numberOfLines={isCollapsible && !isExpanded ? COLLAPSED_LINES : undefined}
                monospace
            >
                {message}
            </Text>
        </TouchableOpacity>
    );
});
