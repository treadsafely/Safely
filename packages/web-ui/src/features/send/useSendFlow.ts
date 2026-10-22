import { useCallback, useEffect, useState } from 'react';

import type { SendFormInitialValues } from '@safely/ux';
import { useScanQrScheme } from '@safely/ux';

import type { DisclosureProps } from '../../shared';
import { useDisclosure } from '../../shared';

const SCAN_SCHEMES = ['btc-transfer'] as const;

export function useSendFlow(props: DisclosureProps) {
    const { isOpen, onOpen, onClose } = useDisclosure(props);

    const [initialValues, setInitialValues] = useState<SendFormInitialValues | undefined>();

    useEffect(() => {
        if (!isOpen) {
            setInitialValues(undefined);
        }
    }, [isOpen]);

    const scan = useScanQrScheme({
        allowedSchemes: SCAN_SCHEMES,
        onResult: useCallback(
            scheme => {
                setInitialValues({
                    recipient: scheme.parsed.address,
                    amount: scheme.parsed.amount
                });
                onOpen();
            },
            [onOpen]
        )
    });

    return { isOpen, initialValues, onOpen, onClose, scan };
}
