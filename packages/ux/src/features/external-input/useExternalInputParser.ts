import { useCallback } from 'react';

import type { ExternalInputSchemeName, SchemeByName } from '@safely/core';
import { parseExternalInput } from '@safely/core';

import { useToast } from '../../entities';
import { useLogger, useParseError, useTranslate } from '../../shared';

interface UseExternalInputParserOptions<
    SName extends ExternalInputSchemeName = ExternalInputSchemeName
> {
    allowedSchemes?: readonly SName[];
    showErrorToast?: boolean;
}

export function useExternalInputParser<
    SName extends ExternalInputSchemeName = ExternalInputSchemeName
>(options?: UseExternalInputParserOptions<SName>): (raw: string) => SchemeByName<SName> | null {
    const { allowedSchemes, showErrorToast = true } = options ?? {};

    const t = useTranslate();
    const toast = useToast();
    const logger = useLogger('external-input');

    const parseError = useParseError({
        ParserUnsupportedSchemeError: t('externalInput.errors.unsupportedScheme'),
        ParserUnrecognizedError: t('externalInput.errors.unrecognized'),
        ParserInvalidAmountError: t('externalInput.errors.invalidAmount'),
        ParserUnsupportedMemoError: t('externalInput.errors.unsupportedMemo')
    });

    return useCallback(
        (raw: string) => {
            try {
                return parseExternalInput(raw, allowedSchemes) as SchemeByName<SName>;
            } catch (e) {
                const message = parseError(e);
                logger.warn('external input parse failed', { message });

                if (showErrorToast) {
                    toast({
                        message,
                        type: 'error'
                    });
                }

                return null;
            }
        },
        [allowedSchemes, showErrorToast, toast, t, logger]
    );
}
