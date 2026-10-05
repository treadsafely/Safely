import type { DeviceManagementKit, DiscoveredDevice } from '@ledgerhq/device-management-kit';
import { assign, setup } from 'xstate';

import type { LedgerSession } from '@safely/core';
import { LedgerSigningCancelledError } from '@safely/core';

import {
    checkLedgerAppVersion,
    connectLedgerSession,
    disconnectLedgerSession,
    openBitcoinApp,
    runLedgerSession,
    scanLedgerDevices,
    verifyLedgerFingerprint
} from './actors';

const SIGNED_DELAY_MS = 1_000;
const SCAN_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 30_000;

export const LEDGER_FAILURE_STATES = ['failed', 'wrongDevice', 'unsupportedApp'];

export type LedgerSigningInput = {
    ledgerKit: DeviceManagementKit;
    transportIdentifier: string;
    expectedFingerprint: Buffer;
    sessionId: string | null;
    run: (session: LedgerSession) => Promise<unknown>;
};

export type LedgerSigningOutput = {
    result: unknown;
    error: unknown;
};

type LedgerSigningContext = LedgerSigningInput & {
    selectedDevice: DiscoveredDevice | null;
    step: number;
    result: unknown;
    error: unknown;
};

type LedgerSigningEvent =
    { type: 'DEVICES_FOUND'; devices: DiscoveredDevice[] } | { type: 'RETRY' } | { type: 'CANCEL' };

export const ledgerSigningMachine = setup({
    types: {
        context: {} as LedgerSigningContext,
        input: {} as LedgerSigningInput,
        events: {} as LedgerSigningEvent,
        output: {} as LedgerSigningOutput
    },
    actors: {
        scanLedgerDevices,
        connectLedgerSession,
        disconnectLedgerSession,
        openBitcoinApp,
        checkLedgerAppVersion,
        verifyLedgerFingerprint,
        runLedgerSession
    },
    guards: {
        hasLiveSession: ({ context }) => context.sessionId !== null
    },
    delays: {
        connectTimeout: CONNECT_TIMEOUT_MS,
        scanTimeout: SCAN_TIMEOUT_MS,
        signedDelay: SIGNED_DELAY_MS
    }
}).createMachine({
    id: 'ledgerSigning',
    context: ({ input }) => ({
        ...input,
        selectedDevice: null,
        step: 0,
        result: undefined,
        error: undefined
    }),
    initial: 'start',
    on: {
        CANCEL: { target: '.cancelled' }
    },
    states: {
        start: {
            always: [{ guard: 'hasLiveSession', target: 'openingApp' }, { target: 'scanning' }]
        },
        scanning: {
            entry: assign({ step: () => 0, error: () => undefined, result: () => undefined }),
            invoke: {
                src: 'scanLedgerDevices',
                input: ({ context }) => ({
                    ledgerKit: context.ledgerKit,
                    transportIdentifier: context.transportIdentifier
                })
            },
            on: {
                DEVICES_FOUND: {
                    guard: ({ event }) => event.devices.length > 0,
                    actions: assign({ selectedDevice: ({ event }) => event.devices[0] }),
                    target: 'connecting'
                }
            },
            after: {
                scanTimeout: { target: 'failed' }
            }
        },
        connecting: {
            invoke: {
                src: 'connectLedgerSession',
                input: ({ context }) => ({
                    ledgerKit: context.ledgerKit,
                    device: context.selectedDevice!
                }),
                onDone: {
                    actions: assign({ sessionId: ({ event }) => event.output }),
                    target: 'openingApp'
                },
                onError: {
                    actions: assign({ error: ({ event }) => event.error }),
                    target: 'failed'
                }
            },
            after: {
                connectTimeout: { target: 'failed' }
            }
        },
        openingApp: {
            entry: assign({ step: () => 1 }),
            invoke: {
                src: 'openBitcoinApp',
                input: ({ context }) => ({
                    ledgerKit: context.ledgerKit,
                    sessionId: context.sessionId!
                }),
                onDone: {
                    target: 'checkingApp'
                },
                onError: {
                    actions: assign({ error: ({ event }) => event.error }),
                    target: 'failed'
                }
            }
        },
        checkingApp: {
            entry: assign({ step: () => 1 }),
            invoke: {
                src: 'checkLedgerAppVersion',
                input: ({ context }) => ({
                    ledgerKit: context.ledgerKit,
                    sessionId: context.sessionId!
                }),
                onDone: [
                    { guard: ({ event }) => event.output, target: 'verifying' },
                    { target: 'unsupportedApp' }
                ],
                onError: {
                    actions: assign({ error: ({ event }) => event.error }),
                    target: 'failed'
                }
            }
        },
        verifying: {
            entry: assign({ step: () => 1 }),
            invoke: {
                src: 'verifyLedgerFingerprint',
                input: ({ context }) => ({
                    ledgerKit: context.ledgerKit,
                    sessionId: context.sessionId!,
                    expectedFingerprint: context.expectedFingerprint
                }),
                onDone: [
                    { guard: ({ event }) => event.output, target: 'signing' },
                    { target: 'wrongDevice' }
                ],
                onError: {
                    actions: assign({ error: ({ event }) => event.error }),
                    target: 'failed'
                }
            }
        },
        signing: {
            entry: assign({ step: () => 2 }),
            invoke: {
                src: 'runLedgerSession',
                input: ({ context }) => ({
                    ledgerKit: context.ledgerKit,
                    sessionId: context.sessionId!,
                    run: context.run
                }),
                onDone: {
                    actions: assign({ result: ({ event }) => event.output, step: () => 3 }),
                    target: 'signed'
                },
                onError: {
                    actions: assign({ error: ({ event }) => event.error }),
                    target: 'failed'
                }
            }
        },
        signed: {
            on: { CANCEL: {} },
            after: {
                signedDelay: { target: 'done' }
            }
        },
        disconnecting: {
            invoke: {
                src: 'disconnectLedgerSession',
                input: ({ context }) => ({
                    ledgerKit: context.ledgerKit,
                    sessionId: context.sessionId
                }),
                onDone: { actions: assign({ sessionId: () => null }), target: 'scanning' },
                onError: { actions: assign({ sessionId: () => null }), target: 'scanning' }
            }
        },
        wrongDevice: {
            on: { RETRY: { target: 'disconnecting' } }
        },
        unsupportedApp: {
            on: { RETRY: { target: 'disconnecting' } }
        },
        failed: {
            on: { RETRY: { target: 'disconnecting' } }
        },
        cancelled: {
            entry: assign({ error: () => new LedgerSigningCancelledError() }),
            type: 'final'
        },
        done: {
            type: 'final'
        }
    },
    output: ({ context }) => ({ result: context.result, error: context.error })
});
