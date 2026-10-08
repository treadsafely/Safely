import { useMemo, useState } from 'react';

import type { LogLevel, LogRecord } from '@safely/sync';

import { scopeLabel } from './log-format';

export type LogFiltersProps = {
    levels: LogLevel[];
    scopes: string[];
    isLevelActive: (level: LogLevel) => boolean;
    isScopeActive: (scope: string) => boolean;
    onToggleLevel: (level: LogLevel) => void;
    onToggleScope: (scope: string) => void;
};

export const useLogFilters = (records: LogRecord[]) => {
    const [levelSel, setLevelSel] = useState<Set<LogLevel> | null>(null);
    const [scopeSel, setScopeSel] = useState<Set<string> | null>(null);

    const levels = useMemo(
        () => Array.from(new Set(records.map(record => record.level))).sort((a, b) => a - b),
        [records]
    );

    const scopes = useMemo(
        () => Array.from(new Set(records.map(record => scopeLabel(record.path)))).sort(),
        [records]
    );

    const toggleLevel = (level: LogLevel) =>
        setLevelSel(prev => {
            const next = new Set(prev ?? levels);
            if (next.has(level)) {
                next.delete(level);
            } else {
                next.add(level);
            }

            return next;
        });

    const toggleScope = (scope: string) =>
        setScopeSel(prev => {
            const next = new Set(prev ?? scopes);
            if (next.has(scope)) {
                next.delete(scope);
            } else {
                next.add(scope);
            }

            return next;
        });

    const filtered = useMemo(
        () =>
            records
                .filter(record => {
                    if (levelSel && !levelSel.has(record.level)) return false;

                    return !(scopeSel && !scopeSel.has(scopeLabel(record.path)));
                })
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
        [records, levelSel, scopeSel]
    );

    const isLevelActive = (level: LogLevel) => levelSel === null || levelSel.has(level);
    const isScopeActive = (scope: string) => scopeSel === null || scopeSel.has(scope);

    const filterProps: LogFiltersProps = {
        levels,
        scopes,
        isLevelActive,
        isScopeActive,
        onToggleLevel: toggleLevel,
        onToggleScope: toggleScope
    };

    return { filtered, filterProps };
};
