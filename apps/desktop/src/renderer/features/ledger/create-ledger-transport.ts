import { DeviceManagementKitBuilder } from '@ledgerhq/device-management-kit';
import { webHidIdentifier, webHidTransportFactory } from '@ledgerhq/device-transport-kit-web-hid';

import type { Logger } from '@safely/sync';
import type { LedgerTransport } from '@safely/ux';
import { DmkLoggerAdapter } from '@safely/ux';

export const createLedgerTransport = (logger: Logger): LedgerTransport => ({
    createKit: () =>
        new DeviceManagementKitBuilder()
            .addTransport(webHidTransportFactory)
            .addLogger(new DmkLoggerAdapter(logger.child('ledger-dmk')))
            .build(),
    transportIdentifier: webHidIdentifier
});
