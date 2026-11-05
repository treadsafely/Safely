import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';
import { DeviceManagementKitBuilder } from '@ledgerhq/device-management-kit';
import { RNBleTransportFactory } from '@ledgerhq/device-transport-kit-react-native-ble';

import type { Logger } from '@safely/sync';
import { DmkLoggerAdapter } from '@safely/ux';

export const createLedgerKit = (logger: Logger): DeviceManagementKit =>
    new DeviceManagementKitBuilder()
        .addTransport(RNBleTransportFactory)
        .addLogger(new DmkLoggerAdapter(logger.child('ledger-dmk')))
        .build();
