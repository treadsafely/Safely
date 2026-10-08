import type { DeviceManagementKit, DiscoveredDevice } from '@ledgerhq/device-management-kit';
import type { AnyEventObject } from 'xstate';
import { fromCallback, fromPromise } from 'xstate';

import type { LedgerSession } from '@safely/core';
import { LedgerController } from '@safely/core';

import { connectLedger, openBitcoinApp as openBitcoinAppOperation } from '../ledgerOperations';

const MIN_BITCOIN_APP_MAJOR = 2;
const MIN_BITCOIN_APP_MINOR = 1;

const isBitcoinAppSupported = (version: string): boolean => {
    const [major, minor] = version.split('.').map(Number);

    return (
        major > MIN_BITCOIN_APP_MAJOR ||
        (major === MIN_BITCOIN_APP_MAJOR && minor >= MIN_BITCOIN_APP_MINOR)
    );
};

export type CheckLedgerAppVersionInput = {
    ledgerKit: DeviceManagementKit;
    sessionId: string;
};

export const checkLedgerAppVersion = fromPromise<boolean, CheckLedgerAppVersionInput>(
    async ({ input }) => {
        const version = await new LedgerController(
            input.ledgerKit,
            input.sessionId
        ).getAppVersion();

        return isBitcoinAppSupported(version);
    }
);

export const scanLedgerDevices = fromCallback<
    AnyEventObject,
    { ledgerKit: DeviceManagementKit; transportIdentifier: string }
>(({ sendBack, input }) => {
    const subscription = input.ledgerKit
        .listenToAvailableDevices({ transport: input.transportIdentifier })
        .subscribe({
            next: devices => sendBack({ type: 'DEVICES_FOUND', devices }),
            error: () => {
                // TODO Think again what to do, log? timeout? Too much noise from here
            }
        });

    return () => subscription.unsubscribe();
});

export type DisconnectLedgerSessionInput = {
    ledgerKit: DeviceManagementKit;
    sessionId: string | null;
};

export const disconnectLedgerSession = fromPromise<void, DisconnectLedgerSessionInput>(
    async ({ input }) => {
        if (input.sessionId) {
            await input.ledgerKit.disconnect({ sessionId: input.sessionId }).catch(() => {});
        }
    }
);

export type ConnectLedgerSessionInput = {
    ledgerKit: DeviceManagementKit;
    device: DiscoveredDevice;
};

export const connectLedgerSession = fromPromise<string, ConnectLedgerSessionInput>(
    async ({ input, signal }) => {
        const sessionId = await connectLedger(input.ledgerKit, input.device);

        if (signal.aborted) {
            void input.ledgerKit.disconnect({ sessionId }).catch(() => {});

            throw new Error('Ledger connect aborted');
        }

        return sessionId;
    }
);

export type OpenBitcoinAppInput = {
    ledgerKit: DeviceManagementKit;
    sessionId: string;
};

export const openBitcoinApp = fromPromise<void, OpenBitcoinAppInput>(({ input, signal }) =>
    openBitcoinAppOperation(input.ledgerKit, input.sessionId, signal)
);

export type VerifyLedgerFingerprintInput = {
    ledgerKit: DeviceManagementKit;
    sessionId: string;
    expectedFingerprint: Buffer;
};

export const verifyLedgerFingerprint = fromPromise<boolean, VerifyLedgerFingerprintInput>(
    async ({ input }) => {
        const fingerprint = await new LedgerController(
            input.ledgerKit,
            input.sessionId
        ).getMasterFingerprint();

        return fingerprint.equals(input.expectedFingerprint);
    }
);

export type RunLedgerSessionInput = {
    ledgerKit: DeviceManagementKit;
    sessionId: string;
    run: (session: LedgerSession) => Promise<unknown>;
};

export const runLedgerSession = fromPromise<unknown, RunLedgerSessionInput>(({ input, signal }) =>
    input.run({ ledgerKit: input.ledgerKit, sessionId: input.sessionId, signal })
);
