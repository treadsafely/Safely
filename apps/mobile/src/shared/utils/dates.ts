import { startOfDay } from '@safely/ux';

export {
    startOfHour,
    startOfDay,
    startOfMonth,
    startOfYear,
    addMonthsToTimestamp,
    addYearsToTimestamp
} from '@safely/ux';

export const diffInDays = (date: Date, baseDate: Date) =>
    Math.floor((startOfDay(baseDate) - startOfDay(date)) / (24 * 60 * 60 * 1000));

export const startOfWeek = (date: Date) =>
    new Date(
        date.getFullYear(),
        date.getMonth(),
        // starts from Monday. TODO: We should get this setting from user's preferences in future.
        date.getDate() - ((date.getDay() + 6) % 7)
    ).getTime();
