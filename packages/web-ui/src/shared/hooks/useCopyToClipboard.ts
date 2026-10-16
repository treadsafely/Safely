import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppContext, useTranslate } from '@safely/ux';

const COPIED_VISIBLE_MS = 1600;

export function useCopyToClipboard() {
    const t = useTranslate();
    const { logger, toast } = useAppContext();

    const [isCopied, setIsCopied] = useState(false);
    const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => () => clearTimeout(timeout.current), []);

    const copy = useCallback(
        (value: string) => {
            void navigator.clipboard
                .writeText(value)
                .then(() => {
                    setIsCopied(true);
                    clearTimeout(timeout.current);
                    timeout.current = setTimeout(() => setIsCopied(false), COPIED_VISIBLE_MS);
                })
                .catch((error: unknown) => {
                    logger.error('clipboard write failed', error);
                    toast.show({ message: t('actions.copyFailed'), type: 'error' });
                });
        },
        [logger, toast, t]
    );

    return { isCopied, copy };
}
