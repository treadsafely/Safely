import type { DiscoveredDevice } from '@ledgerhq/device-management-kit';
import { useCallback, useEffect, useRef } from 'react';

import { useLedgerSession } from './LedgerSessionProvider';
import type { DiscoveryError } from './useLedgerDeviceScan';
import { useLedgerDeviceScan } from './useLedgerDeviceScan';
import { useToast } from '../../entities';
import { useTranslate } from '../../shared';

const ERROR_MESSAGE_KEYS = {
    timedOut: 'addWallet.connectLedger.discovery.notFound',
    locationDisabled: 'addWallet.connectLedger.discovery.locationDisabled'
} as const satisfies Record<DiscoveryError, string>;

export const useLedgerDiscovery = (params: {
    onDeviceFound: (device: DiscoveredDevice) => void;
    onError: () => void;
}) => {
    const { onDeviceFound, onError } = params;

    const t = useTranslate();
    const toast = useToast();
    const { setSelectedDevice } = useLedgerSession();
    const { devices, error } = useLedgerDeviceScan();
    const hasFinished = useRef(false);

    const device = devices[0];

    useEffect(() => {
        if (!device || hasFinished.current) {
            return;
        }

        hasFinished.current = true;
        setSelectedDevice(device);
        onDeviceFound(device);
    }, [device, setSelectedDevice, onDeviceFound]);

    useEffect(() => {
        if (!error || hasFinished.current) {
            return;
        }

        hasFinished.current = true;
        toast(t(ERROR_MESSAGE_KEYS[error]));
        onError();
    }, [error, toast, t, onError]);

    const reset = useCallback(() => {
        hasFinished.current = false;
    }, []);

    return { reset };
};
