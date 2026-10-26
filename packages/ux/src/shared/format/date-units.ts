export const startOfHour = (date: Date): number =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).getTime();

export const startOfDay = (date: Date): number =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const startOfMonth = (date: Date): number =>
    new Date(date.getFullYear(), date.getMonth()).getTime();

export const startOfYear = (date: Date): number => new Date(date.getFullYear(), 0).getTime();

export const addMonthsToTimestamp = (timestamp: number, monthsToAdd: number): number => {
    const next = new Date(timestamp);
    next.setMonth(next.getMonth() + monthsToAdd);

    return next.getTime();
};

export const addYearsToTimestamp = (timestamp: number, yearsToAdd: number): number => {
    const next = new Date(timestamp);
    next.setFullYear(next.getFullYear() + yearsToAdd);

    return next.getTime();
};
