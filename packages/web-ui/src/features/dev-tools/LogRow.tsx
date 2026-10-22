import type { FC } from 'react';
import { memo, useState } from 'react';

import { LogLevel } from '@safely/sync';
import type { LogRecord } from '@safely/sync';
import { formatLogMessage, logLevelTone, scopeLabel } from '@safely/ux';
import { cx } from '@safely/web-ui/styled-system/css';

import {
    collapsedMessageStyles,
    messageStyles,
    rowMetaStyles,
    rowStyles,
    scopeStyles
} from './LogsSection.styles';
import { Button, Text, useCopyToClipboard } from '../../shared';

const COLLAPSED_LINES = 8;
const COLLAPSED_CHARS = 400;

export type LogRowProps = {
    record: LogRecord;
};

export const LogRow: FC<LogRowProps> = memo(({ record }) => {
    const { copy } = useCopyToClipboard();
    const [isExpanded, setIsExpanded] = useState(false);

    const message = formatLogMessage(record.message);
    const isCollapsible =
        message.split('\n').length > COLLAPSED_LINES || message.length > COLLAPSED_CHARS;

    const copyRecord = (): void =>
        copy(
            `${LogLevel[record.level]} ${record.timestamp} ${scopeLabel(record.path)}\n${message}`
        );

    return (
        <div className={rowStyles} onClick={copyRecord}>
            <div className={rowMetaStyles}>
                <Text variant="labelS" tone={logLevelTone(record.level)}>
                    {LogLevel[record.level]}
                </Text>
                <Text variant="bodyS" tone="tertiary">
                    {record.timestamp.slice(11, 23)}
                </Text>
                <Text variant="bodyS" tone="secondary" isTruncated className={scopeStyles}>
                    {scopeLabel(record.path)}
                </Text>
                {isCollapsible && (
                    <Button
                        variant="secondary"
                        size="xsmall"
                        onClick={event => {
                            event.stopPropagation();
                            setIsExpanded(current => !current);
                        }}
                    >
                        {isExpanded ? 'Less' : 'More'}
                    </Button>
                )}
            </div>
            <Text
                variant="bodyLMono"
                className={cx(
                    messageStyles,
                    isCollapsible && !isExpanded && collapsedMessageStyles
                )}
            >
                {message}
            </Text>
        </div>
    );
});
