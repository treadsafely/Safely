import type { LogLevel } from './log-level';

export type LogMeta = {
    appVersion: string;
    build: string;
    device: string;
};

export type LogRecord = {
    timestamp: string;
    level: LogLevel;
    path: string[];
    message: string;
    appVersion: string;
    build: string;
    device: string;
};
