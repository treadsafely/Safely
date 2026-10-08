import { app } from 'electron';
import os from 'node:os';

import { SanitizedTransport } from '@safely/core';
import {
    CombinedTransport,
    ConsoleTransport,
    FileTransport,
    Logger,
    LogLevel,
    logsFilterMinSeverityLevel
} from '@safely/sync';

import { LogFileStore } from './logs/log-file-store';
import { DESKTOP_BUILD } from '../shared/app-info';

/* `~/Library/Logs/Safely`: the directory Console.app and electron-log use, one path for support */
export const logStore = new LogFileStore(app.getPath('logs'));

export const fileTransport = new FileTransport(logStore, {
    appVersion: app.getVersion(),
    build: DESKTOP_BUILD,
    device: `${os.hostname()}, ${os.release()}`
});

/** Separate from the renderer's: main must be able to report a failure before any window exists. */
export const mainLogger = new Logger(
    new CombinedTransport([new ConsoleTransport(), new SanitizedTransport(fileTransport)])
).child('main');

/* The default filter starts at INFO, which would hide the forwarded renderer output. */
mainLogger.setLogsFilter(
    logsFilterMinSeverityLevel(app.isPackaged ? LogLevel.INFO : LogLevel.TRACE)
);
