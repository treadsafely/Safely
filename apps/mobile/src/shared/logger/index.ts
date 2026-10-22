import { FileTransport } from '@safely/sync';
import type { LogRecord } from '@safely/sync';

import packageJson from '../../../package.json';
import { build, deviceInfo } from '../app-meta';
import { buildLogger } from './build-logger';
import { LogFileStore } from './log-file-store';

const store = new LogFileStore();
const transport = new FileTransport(store, {
    appVersion: packageJson.version,
    build,
    device: `${deviceInfo.name}, ${deviceInfo.osVersion}`
});

export const logger = buildLogger(transport, __DEV__);
/* the files and the context buffer go together: a buffer that survives writes the past back */
export const eraseLogs = async (): Promise<void> => {
    await store.erase();
    transport.reset();
};
export const shareLogs = (): Promise<void> => store.share();
export const readLogs = (): Promise<LogRecord[]> => store.read();
const unhandledLogger = logger.child('unhandled');

const prevHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
    unhandledLogger.error(isFatal ? 'fatal' : 'error', error);
    prevHandler(error, isFatal);
});

if (typeof globalThis.onunhandledrejection === 'undefined') {
    globalThis.onunhandledrejection = (event: PromiseRejectionEvent) => {
        unhandledLogger.error('promise rejection', event.reason);
    };
}
