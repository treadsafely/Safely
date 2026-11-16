import {
    addMonthsToTimestamp,
    addYearsToTimestamp,
    startOfDay,
    startOfHour,
    startOfMonth,
    startOfYear
} from '../format';

export enum ChartPeriod {
    ONE_HOUR = '1h',
    ONE_DAY = '24h',
    ONE_WEEK = '7d',
    ONE_MONTH = '30d',
    NINETY_DAYS = '90d',
    ONE_YEAR = '12m',
    ALL_TIME = 'all'
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type TickConfig = {
    tick: (index: number) => 'small' | 'medium' | 'large';
    mediumTickColor?: 'tertiary' | 'secondary';
    count: number;
};

export type ChartConfig = {
    startOfPeriod: (date: Date) => number;
    fullPeriodLength: number;
    getPeriodIntermediatePoints: (startDate: number) => number[];
    tickConfig: TickConfig;
    crosshairDateFormat: Intl.DateTimeFormatOptions;
    footerDateFormat: Intl.DateTimeFormatOptions;
};

type StepFn = (start: number, index: number) => number;

const byMs =
    (ms: number): StepFn =>
    (start, index) =>
        start + index * ms;
const byMonths: StepFn = (start, index) => addMonthsToTimestamp(start, index);
const byYears: StepFn = (start, index) => addYearsToTimestamp(start, index);

const intermediatePoints =
    (segments: number, step: StepFn) =>
    (startDate: number): number[] =>
        Array.from({ length: segments + 1 }, (_, index) => step(startDate, index));

type TickParams = {
    majorEvery: number;
    majorSpans: number;
    mediumEvery?: number;
    mediumTickColor?: 'tertiary' | 'secondary';
    minorTick?: 'small' | 'medium';
};

const buildTickConfig = (params: TickParams): TickConfig => {
    const { majorEvery, majorSpans, mediumEvery, mediumTickColor, minorTick = 'small' } = params;

    return {
        tick: index => {
            if (index % majorEvery === 0) return 'large';
            if (mediumEvery !== undefined && index % mediumEvery === 0) return 'medium';
            return minorTick;
        },
        mediumTickColor,
        count: majorEvery * majorSpans + 1
    };
};

const ALL_TIME_START = new Date(2014, 0).getTime();
const ALL_TIME_YEAR_STEP = 4;

function computeAllTimeIntermediatePoints(startDate: number): number[] {
    const points: number[] = [startDate];
    let lastPoint = startDate;
    while (lastPoint < Date.now()) {
        lastPoint = addYearsToTimestamp(lastPoint, ALL_TIME_YEAR_STEP);
        points.push(lastPoint);
    }

    return points;
}

export const CHART_CONFIG: Record<ChartPeriod, ChartConfig> = {
    [ChartPeriod.ONE_HOUR]: {
        startOfPeriod: startOfHour,
        fullPeriodLength: HOUR,
        getPeriodIntermediatePoints: intermediatePoints(4, byMs(HOUR / 2)),
        tickConfig: buildTickConfig({ majorEvery: 60, majorSpans: 2, mediumEvery: 15 }),
        crosshairDateFormat: { hour: '2-digit', minute: '2-digit' },
        footerDateFormat: { hour: '2-digit', minute: '2-digit' }
    },
    [ChartPeriod.ONE_DAY]: {
        startOfPeriod: startOfDay,
        fullPeriodLength: DAY,
        getPeriodIntermediatePoints: intermediatePoints(2, byMs(DAY)),
        tickConfig: buildTickConfig({ majorEvery: 24, majorSpans: 2, mediumEvery: 6 }),
        crosshairDateFormat: { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' },
        footerDateFormat: { month: 'short', day: 'numeric' }
    },
    [ChartPeriod.ONE_WEEK]: {
        startOfPeriod: () => startOfDay(new Date(Date.now() - 6 * DAY)),
        fullPeriodLength: 7 * DAY,
        getPeriodIntermediatePoints: intermediatePoints(7, byMs(DAY)),
        tickConfig: buildTickConfig({ majorEvery: 2, majorSpans: 7 }),
        crosshairDateFormat: { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
        footerDateFormat: { weekday: 'short' }
    },
    [ChartPeriod.ONE_MONTH]: {
        startOfPeriod: startOfMonth,
        fullPeriodLength: 30 * DAY,
        getPeriodIntermediatePoints: intermediatePoints(2, byMonths),
        tickConfig: buildTickConfig({ majorEvery: 30, majorSpans: 2 }),
        crosshairDateFormat: { month: 'short', day: 'numeric', year: 'numeric' },
        footerDateFormat: { month: 'short' }
    },
    [ChartPeriod.NINETY_DAYS]: {
        startOfPeriod: startOfMonth,
        fullPeriodLength: 90 * DAY,
        getPeriodIntermediatePoints: intermediatePoints(4, byMonths),
        tickConfig: buildTickConfig({ majorEvery: 29, majorSpans: 4, mediumTickColor: 'tertiary' }),
        crosshairDateFormat: { month: 'short', day: 'numeric', year: 'numeric' },
        footerDateFormat: { month: 'short' }
    },
    [ChartPeriod.ONE_YEAR]: {
        startOfPeriod: startOfYear,
        fullPeriodLength: 365 * DAY,
        getPeriodIntermediatePoints: intermediatePoints(2, byYears),
        tickConfig: buildTickConfig({
            majorEvery: 12,
            majorSpans: 2,
            mediumTickColor: 'tertiary',
            minorTick: 'medium'
        }),
        crosshairDateFormat: { month: 'short', year: 'numeric' },
        footerDateFormat: { year: 'numeric' }
    },
    [ChartPeriod.ALL_TIME]: {
        startOfPeriod: () => ALL_TIME_START,
        get fullPeriodLength() {
            return Date.now() - ALL_TIME_START;
        },
        getPeriodIntermediatePoints: computeAllTimeIntermediatePoints,
        crosshairDateFormat: { month: 'short', year: 'numeric' },
        footerDateFormat: { year: 'numeric' },
        tickConfig: {
            tick: index => (index % ALL_TIME_YEAR_STEP === 0 ? 'large' : 'medium'),
            mediumTickColor: 'tertiary',
            get count() {
                const segments = computeAllTimeIntermediatePoints(ALL_TIME_START).length - 1;

                return segments * ALL_TIME_YEAR_STEP + 1;
            }
        }
    }
};
