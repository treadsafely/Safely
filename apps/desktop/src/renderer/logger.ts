import { FileTransport } from '@safely/sync';
import { buildWebLogger } from '@safely/web-ui';

import { platform } from './platform';

const { appInfo } = platform;

export const fileTransport = new FileTransport(platform.logs, {
    appVersion: appInfo.version,
    build: appInfo.build,
    device: `${appInfo.deviceName}, ${appInfo.osVersion}`
});

/** One per renderer: the storage adapters, the query client and the app context log through it. */
export const { logger } = buildWebLogger(appInfo.environment === 'development', fileTransport);
