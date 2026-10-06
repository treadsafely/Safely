import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { FC } from 'react';

import type { ILogFileStore } from '@safely/sync';
import { useLogFilters } from '@safely/ux';

import { devToolsLogsKeys } from './keys';
import { LogFilters } from './LogFilters';
import { LogRow } from './LogRow';
import { emptyStyles, listStyles, rootStyles, toolbarStyles } from './LogsSection.styles';
import { Button, Text } from '../../shared';

export type LogsSectionProps = {
    store: ILogFileStore;
};

export const LogsSection: FC<LogsSectionProps> = ({ store }) => {
    const client = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: devToolsLogsKeys.records.toKey(),
        queryFn: () => store.read(),
        staleTime: 0,
        gcTime: 0
    });
    const { filtered, filterProps } = useLogFilters(data ?? []);

    const refresh = (): Promise<void> =>
        client.invalidateQueries({ queryKey: devToolsLogsKeys.records.toKey() });

    const erase = async (): Promise<void> => {
        if (!window.confirm('Erase all log files on this device?')) {
            return;
        }

        await store.erase();
        await refresh();
    };

    return (
        <div className={rootStyles}>
            <div className={toolbarStyles}>
                <Button variant="secondary" size="small" onClick={() => void refresh()}>
                    Refresh
                </Button>
                <Button variant="secondary" size="small" onClick={() => void store.share()}>
                    Show in folder
                </Button>
                <Button variant="destructive" size="small" onClick={() => void erase()}>
                    Erase
                </Button>
            </div>

            <LogFilters {...filterProps} />

            <div className={listStyles}>
                {filtered.map((record, index) => (
                    <LogRow key={`${record.timestamp}_${index}`} record={record} />
                ))}
                {filtered.length === 0 && (
                    <Text variant="bodyM" tone="secondary" className={emptyStyles}>
                        {isLoading ? 'Loading…' : 'No logs'}
                    </Text>
                )}
            </div>
        </div>
    );
};
