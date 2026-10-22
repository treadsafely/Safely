import { LogLevel } from '@safely/sync';

export type LogLevelTone = 'accentRed' | 'accentOrange' | 'primary' | 'tertiary';

export const scopeLabel = (path: string[]): string =>
    path.length > 0 ? path.join(' › ') : '(root)';

export const formatLogMessage = (message: string): string => {
    const trimmed = message.trim();
    const start = trimmed.search(/[{[]/);

    if (start !== -1) {
        try {
            const pretty = JSON.stringify(JSON.parse(trimmed.slice(start)), null, 2);
            const prefix = trimmed.slice(0, start).trim();

            return prefix ? `${prefix}\n${pretty}` : pretty;
        } catch {
            return message;
        }
    }

    return message;
};

export const logLevelTone = (level: LogLevel): LogLevelTone => {
    if (level >= LogLevel.ERROR) return 'accentRed';
    if (level >= LogLevel.WARN) return 'accentOrange';
    if (level >= LogLevel.INFO) return 'primary';

    return 'tertiary';
};
