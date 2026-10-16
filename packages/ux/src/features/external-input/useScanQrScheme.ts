import { useCallback } from 'react';

import type { ExternalInputScheme, ExternalInputSchemeName } from '@safely/core';

import { useExternalInputParser } from './useExternalInputParser';
import { useAppContext, useLogger } from '../../shared';

interface UseScanQrSchemeOptions {
    onResult: (scheme: ExternalInputScheme) => void;
    allowedSchemes?: readonly ExternalInputSchemeName[];
    scannerOptions?: { titleTranslationKey?: string; subTranslationKey?: string };
}

export function useScanQrScheme(options: UseScanQrSchemeOptions): () => void {
    const { onResult, allowedSchemes, scannerOptions } = options;

    const { qrScanner } = useAppContext();
    const logger = useLogger('external-input');
    const parse = useExternalInputParser({ allowedSchemes });

    return useCallback(() => {
        qrScanner
            .scan(scannerOptions)
            .then(raw => {
                const result = parse(raw);

                if (result !== null) {
                    onResult(result);
                }
            })
            .catch((error: unknown) => logger.warn('qr scan failed', { message: String(error) }));
    }, [qrScanner, scannerOptions, parse, onResult, logger]);
}
