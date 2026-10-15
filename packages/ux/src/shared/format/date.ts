import { useMemo } from 'react';

import { useAppContext } from '../providers';

export function useDateFormatter(options?: Intl.DateTimeFormatOptions) {
    const {
        i18n: { language }
    } = useAppContext();

    return useMemo(() => {
        const createFormatCallback = (formatter: Intl.DateTimeFormat) => (date?: Date | number) => {
            let formatted = formatter.format(date);

            if (language.startsWith('en')) {
                formatted = formatted.replace(' at ', ', ');
            }

            return formatted;
        };

        const formatterCallback = (rewriteOpts: Intl.DateTimeFormatOptions) => {
            return {
                format: createFormatCallback(
                    new Intl.DateTimeFormat(language, { ...options, ...rewriteOpts })
                )
            };
        };

        formatterCallback.format = createFormatCallback(new Intl.DateTimeFormat(language, options));

        formatterCallback.formatWithNonCurrentYear = (date: Date | number) => {
            const isCurrentYear = new Date(date).getFullYear() === new Date().getFullYear();

            return isCurrentYear
                ? formatterCallback.format(date)
                : formatterCallback({ year: 'numeric' }).format(date);
        };

        return formatterCallback;
    }, [language, options]);
}

export type DateFormatter = ReturnType<typeof useDateFormatter>;
