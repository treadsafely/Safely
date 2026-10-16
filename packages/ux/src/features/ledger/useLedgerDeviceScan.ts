import type { DiscoveredDevice } from '@ledgerhq/device-management-kit';
import { useEffect, useState } from 'react';

import { useLedgerSession } from './LedgerSessionProvider';
import { useAppContext } from '../../shared';

export type DiscoveryStatus = 'searching' | 'found' | 'error';

export type DiscoveryError = 'timedOut' | 'locationDisabled';

const SCAN_TIMEOUT_MS = 30_000;

// BleErrorCode.LocationServicesDisabled from react-native-ble-plx, which ux must not import
const BLE_LOCATION_SERVICES_DISABLED = 601;

const isLocationServicesDisabledError = (error: unknown) =>
    typeof error === 'object' &&
    error !== null &&
    'errorCode' in error &&
    error.errorCode === BLE_LOCATION_SERVICES_DISABLED;

export const useLedgerDeviceScan = () => {
    const { getLedgerKit } = useLedgerSession();
    const { ledgerTransport } = useAppContext();
    const [error, setError] = useState<DiscoveryError | null>(null);
    const [devices, setDevices] = useState<DiscoveredDevice[]>([]);

    useEffect(() => {
        const subscription = getLedgerKit()
            .listenToAvailableDevices({ transport: ledgerTransport.transportIdentifier })
            .subscribe({
                next: setDevices,
                error: (scanError: unknown) =>
                    setError(
                        isLocationServicesDisabledError(scanError) ? 'locationDisabled' : 'timedOut'
                    )
            });

        const timer = setTimeout(() => {
            subscription.unsubscribe();
            setError(current => current ?? 'timedOut');
        }, SCAN_TIMEOUT_MS);

        return () => {
            clearTimeout(timer);
            subscription.unsubscribe();
            setDevices([]);
        };
    }, [getLedgerKit, ledgerTransport]);

    const status: DiscoveryStatus = error ? 'error' : devices.length > 0 ? 'found' : 'searching';

    return { devices, status, error };
};
