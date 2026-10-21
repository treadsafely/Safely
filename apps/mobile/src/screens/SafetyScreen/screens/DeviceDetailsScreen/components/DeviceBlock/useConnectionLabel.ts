import { useTranslation } from 'react-i18next';

import { resolveConnectionLabel, useDateFormatter } from '@safely/ux';

type ConnectionLabel = {
    label: string;
    date: string | null;
};

export function useConnectionLabel(lastSyncAt: number | null): ConnectionLabel {
    const { t } = useTranslation();
    const formatDate = useDateFormatter({ day: 'numeric', month: 'short', year: 'numeric' });
    const { labelKey, count, hasDate } = resolveConnectionLabel(lastSyncAt);

    return {
        label: count === null ? t(labelKey) : t(labelKey, { count }),
        date: hasDate && lastSyncAt !== null ? formatDate.format(lastSyncAt) : null
    };
}
