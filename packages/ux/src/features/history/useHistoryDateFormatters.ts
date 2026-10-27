import { useDateFormatter } from '../../shared';

const TIME_FORMAT_OPTIONS = { hour: 'numeric', minute: 'numeric' } as const;
const DAY_MONTH_FORMAT_OPTIONS = { day: 'numeric', month: 'short' } as const;

export function useHistoryDateFormatters() {
    return {
        groupFormatter: useDateFormatter(),
        timeFormatter: useDateFormatter(TIME_FORMAT_OPTIONS),
        dayMonthFormatter: useDateFormatter(DAY_MONTH_FORMAT_OPTIONS)
    };
}
