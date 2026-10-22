import { useCallback, useState } from 'react';

import type { LanguageCode } from './translations';
import { usePrefetchBootConfig } from '../api';
import { useAppContext } from '../providers';

interface LanguageSwitch {
    pendingLanguage: LanguageCode | null;
    select: (code: LanguageCode) => void;
}

export function useLanguageSwitch(): LanguageSwitch {
    const { i18n, toast } = useAppContext();
    const { isCached, prefetch } = usePrefetchBootConfig();
    const [pendingLanguage, setPendingLanguage] = useState<LanguageCode | null>(null);

    const select = useCallback(
        (code: LanguageCode) => {
            if (i18n.language === code || pendingLanguage !== null) {
                return;
            }

            if (isCached(code)) {
                void i18n.changeLanguage(code);

                return;
            }

            void (async () => {
                setPendingLanguage(code);

                try {
                    if (await prefetch(code)) {
                        void i18n.changeLanguage(code);
                    } else {
                        toast.show({ message: i18n.t('language.switchFailed'), type: 'error' });
                    }
                } finally {
                    setPendingLanguage(null);
                }
            })();
        },
        [i18n, pendingLanguage, isCached, prefetch, toast]
    );

    return { pendingLanguage, select };
}
