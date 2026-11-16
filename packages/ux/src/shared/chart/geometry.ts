import { SPACE } from '@safely/core';

export type ChartPoint = {
    x: number;
    y: number;
    timestamp: number;
    price: number;
};

export function formatCompactPrice(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1e9) return `${value / 1e9}${SPACE.THSP}B`;
    if (abs >= 1e6) return `${value / 1e6}${SPACE.THSP}M`;

    return `${value / 1e3}${SPACE.THSP}K`;
}

const NICE_MULTIPLIERS = [1, 2, 2.5, 5, 10];

function niceStepsAround(x: number): number[] {
    if (x <= 0) return [1];

    const k = Math.floor(Math.log10(x));
    const bases = [10 ** (k - 1), 10 ** k, 10 ** (k + 1)];

    const steps = bases.flatMap(b => NICE_MULTIPLIERS.map(m => m * b));

    return [...new Set(steps)].sort((a, b) => a - b);
}

function thirdIndex(value: number, axisMin: number, step: number): number {
    if (value <= axisMin + step) return 0;
    if (value <= axisMin + 2 * step) return 1;

    return 2;
}

function scoreAxis(minVal: number, maxVal: number, axisMin: number, step: number): number {
    const axisMax = axisMin + 3 * step;
    if (minVal < axisMin || maxVal > axisMax) return Infinity;

    const minThird = thirdIndex(minVal, axisMin, step);
    const maxThird = thirdIndex(maxVal, axisMin, step);

    const dataCenter = (minVal + maxVal) / 2;
    const axisCenter = axisMin + 1.5 * step;
    const balancePenalty = Math.abs(dataCenter - axisCenter) / step;

    const wastedSpace = axisMax - axisMin - (maxVal - minVal);
    const wastePenalty = wastedSpace / step;

    const sameThirdPenalty = minThird === maxThird ? 2 : 0;

    return sameThirdPenalty + balancePenalty + 0.2 * wastePenalty;
}

// Reference: https://andreev-co.slack.com/archives/C0A8LP6SZ5K/p1773311124207309
function elegantScale(minVal: number, maxVal: number): [number, number, number, number] {
    if (minVal > maxVal) [minVal, maxVal] = [maxVal, minVal];

    const range = maxVal - minVal;
    const magnitude = Math.max(Math.abs(minVal), Math.abs(maxVal), 1);
    const rawStep = Math.max(range / 3, magnitude * 1e-3, 1e-12);
    const candidateSteps = niceStepsAround(rawStep).filter(s => s >= rawStep / 2);

    let bestScore = Infinity;
    let bestAxisMin = 0;
    let bestStep = rawStep;

    for (const step of candidateSteps) {
        const kMin = Math.floor((maxVal - 3 * step) / step);
        const kMax = Math.floor(minVal / step);
        const kStart = minVal >= 0 ? Math.max(kMin, 0) : kMin;

        for (let k = kStart; k <= kMax; k++) {
            const axisMin = k * step;
            const score = scoreAxis(minVal, maxVal, axisMin, step);

            if (score < bestScore) {
                bestScore = score;
                bestAxisMin = axisMin;
                bestStep = step;
            }
        }
    }

    return [
        bestAxisMin,
        bestAxisMin + bestStep,
        bestAxisMin + 2 * bestStep,
        bestAxisMin + 3 * bestStep
    ];
}

export type ElegantPrice = { price: number; y: number; shouldBeRendered: boolean };

export const buildChartPoints = (
    width: number,
    height: number,
    prices: [number, number][],
    xAxisRange?: {
        startTimestamp: number;
        endTimestamp: number;
    }
): {
    elegantPrices?: ElegantPrice[];
    points: ChartPoint[];
} => {
    const points = prices.map(([timestamp, price]) => ({
        x: timestamp,
        y: price,
        timestamp,
        price
    }));

    const count = points.length;
    if (count === 0) {
        return { points: [] };
    }

    const yValues = points.map(point => point.y);

    const min = Math.min(...yValues);
    const max = Math.max(...yValues);

    const scale = elegantScale(min, max);
    const scaleMin = scale[0];
    const dataSpan = max - scaleMin;
    const range = dataSpan > 0 ? dataSpan / 0.85 : scale[3] - scale[0];

    const toMilliseconds = (timestamp: number) => {
        // API may return unix seconds while axis timestamps are in milliseconds.
        return timestamp < 1e12 ? timestamp * 1000 : timestamp;
    };

    const timestamps = points.map(point => toMilliseconds(point.timestamp));
    const startTimestamp = xAxisRange ? xAxisRange.startTimestamp : Math.min(...timestamps);
    const endTimestamp = xAxisRange ? xAxisRange.endTimestamp : Math.max(...timestamps);
    const timeRange = endTimestamp - startTimestamp || 1;

    const mappedPoints = points.map((value, index) => {
        const normalized = (value.y - scaleMin) / range;
        const clamped = Math.max(0, Math.min(1, normalized));
        const timestamp = timestamps[index];
        const normalizedX = (timestamp - startTimestamp) / timeRange;

        return {
            x: normalizedX * width,
            y: height - clamped * height,
            timestamp,
            price: value.price
        };
    });

    const elegantPrices = scale.map(price => {
        const normalized = (price - scaleMin) / range;
        const clamped = Math.max(0, Math.min(1, normalized));
        const y = height - clamped * height;

        const LABEL_X_WIDTH = 40;
        const LABEL_Y_OFFSET = 20;
        const LABEL_Y_HEIGHT = 14;
        const MARGIN = 4;

        const labelTop = y - LABEL_Y_OFFSET - MARGIN;
        const labelBottom = y - LABEL_Y_OFFSET + LABEL_Y_HEIGHT + MARGIN;

        const shouldBeRendered = !mappedPoints.some((point, i) => {
            if (i === 0) return false;
            const prev = mappedPoints[i - 1];
            if (Math.max(prev.x, point.x) <= width - LABEL_X_WIDTH) return false;
            const segYMin = Math.min(prev.y, point.y);
            const segYMax = Math.max(prev.y, point.y);

            return segYMax >= labelTop && segYMin <= labelBottom;
        });

        return {
            price,
            y,
            shouldBeRendered
        };
    });

    return {
        elegantPrices,
        points: mappedPoints
    };
};

export const computePathFractions = (points: ChartPoint[]): number[] => {
    if (points.length === 0) return [];

    const fractions: number[] = [0];
    let cumulative = 0;

    for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        cumulative += Math.sqrt(dx * dx + dy * dy);
        fractions.push(cumulative);
    }

    if (cumulative > 0) {
        for (let i = 1; i < fractions.length; i++) {
            fractions[i] /= cumulative;
        }
    }

    return fractions;
};

export type PeriodSplit = {
    splitIndex: number;
    periodSplitEnd: number;
    splitPoint: ChartPoint | undefined;
};

export const computePeriodSplit = (
    points: ChartPoint[],
    splitTimestamp: number,
    fractions: number[]
): PeriodSplit => {
    const splitIndex = points.findIndex(point => point.timestamp >= splitTimestamp);
    const periodSplitEnd = splitIndex > 0 ? (fractions[splitIndex] ?? 0) : 0;
    const splitPoint = splitIndex >= 0 ? points[splitIndex] : undefined;

    return { splitIndex, periodSplitEnd, splitPoint };
};

export const pointsToSvgPath = (points: ChartPoint[]): string => {
    if (points.length === 0) return '';

    return points
        .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
        .join(' ');
};

export const nearestPointIndex = (points: ChartPoint[], x: number): number => {
    const len = points.length;
    if (len === 0) return -1;

    let low = 0;
    let high = len - 1;

    while (low < high) {
        const mid = (low + high) >> 1;
        if (points[mid].x < x) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }

    if (low > 0 && Math.abs(points[low - 1].x - x) < Math.abs(points[low].x - x)) {
        return low - 1;
    }

    return low;
};

export const priceChangePercent = (startPrice: number, endPrice: number): number | null => {
    if (startPrice === 0) return null;

    const diff = ((endPrice - startPrice) / startPrice) * 100;

    return diff === 0 ? null : diff;
};

export const priceChangeOverPeriod = (
    prices: [number, number][],
    periodStartMs: number
): number | null => {
    if (prices.length < 2) return null;

    const first = prices.find(price => price[0] * 1000 >= periodStartMs);
    if (first === undefined) return null;

    return priceChangePercent(first[1], prices[prices.length - 1][1]);
};
