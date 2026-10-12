import { DeviceActionStatus } from '@ledgerhq/device-management-kit';
import type {
    DeviceActionIntermediateValue,
    DmkError,
    ExecuteDeviceActionReturnType
} from '@ledgerhq/device-management-kit';

import { LedgerAppNotInstalledError, LedgerDeviceBusyError } from '../entities/errors';

type ActionType<Output> = ExecuteDeviceActionReturnType<
    Output,
    DmkError,
    DeviceActionIntermediateValue
>;

const APP_NOT_INSTALLED_ERROR_CODE = '6807';

const toError = (error: DmkError): Error => {
    if (error._tag === 'UnknownDeviceExchangeError') {
        return new LedgerDeviceBusyError();
    }

    if ('errorCode' in error && error.errorCode === APP_NOT_INSTALLED_ERROR_CODE) {
        return new LedgerAppNotInstalledError();
    }

    return new Error(`${error._tag} ${error?.message}`);
};

export const awaitDeviceAction = <Output>(
    action: ActionType<Output>,
    signal?: AbortSignal
): Promise<Output> =>
    new Promise((resolve, reject) => {
        if (signal?.aborted) {
            action.cancel();
            reject(new Error('Device action aborted'));

            return;
        }

        const onAbort = () => {
            subscription.unsubscribe();
            action.cancel();
            reject(new Error('Device action aborted'));
        };

        const subscription = action.observable.subscribe({
            next: state => {
                if (state.status === DeviceActionStatus.Completed) {
                    signal?.removeEventListener('abort', onAbort);
                    subscription.unsubscribe();
                    resolve(state.output);
                } else if (state.status === DeviceActionStatus.Error) {
                    signal?.removeEventListener('abort', onAbort);
                    subscription.unsubscribe();
                    reject(toError(state.error));
                }
            },
            error: error => {
                signal?.removeEventListener('abort', onAbort);
                reject(error instanceof Error ? error : new Error('Device action failed'));
            }
        });

        signal?.addEventListener('abort', onAbort, { once: true });
    });
