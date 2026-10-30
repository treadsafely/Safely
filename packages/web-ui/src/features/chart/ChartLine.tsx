import type { FC, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    buildChartPoints,
    CHART_CONFIG,
    computePathFractions,
    computePeriodSplit,
    formatCompactPrice,
    nearestPointIndex,
    pointsToSvgPath,
    priceChangePercent,
    useDateFormatter,
    useTranslate,
    type ChartPeriod
} from '@safely/ux';

import {
    crosshairLineStyles,
    dotStyles,
    fadedLineStyles,
    legendLabelStyles,
    legendStyles,
    liveDotStyles,
    mainLineStyles,
    plotStyles,
    refLineStyles,
    svgStyles
} from './Chart.styles';
import type { ChartActive } from './types';

const BRIGHT_CLIP_ID = 'chart-bright-band';

export type ChartLineProps = {
    prices: [number, number][];
    period: ChartPeriod;
    startDate: number;
    onActiveChange: (active: ChartActive | null) => void;
};

type Crosshair = { primary: number; secondary: number | null };

export const ChartLine: FC<ChartLineProps> = props => {
    const { prices, period, startDate, onActiveChange } = props;

    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const dateFormatter = useDateFormatter();
    const t = useTranslate();
    const downIndex = useRef<number | null>(null);
    const crosshairRef = useRef<Crosshair | null>(null);

    useEffect(() => {
        const element = ref.current;
        if (element === null) return;

        const observer = new ResizeObserver(entries => {
            const rect = entries[0]?.contentRect;
            const width = rect?.width ?? 0;
            const height = rect?.height ?? 0;
            setSize(prev =>
                prev.width === width && prev.height === height ? prev : { width, height }
            );
        });
        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    const geometry = useMemo(() => {
        if (size.width === 0 || size.height === 0 || prices.length === 0) return null;

        const intermediate = CHART_CONFIG[period].getPeriodIntermediatePoints(startDate);
        const { points, elegantPrices } = buildChartPoints(size.width, size.height, prices, {
            startTimestamp: intermediate[0],
            endTimestamp: intermediate[intermediate.length - 1]
        });

        const fractions = computePathFractions(points);
        const { splitIndex, splitPoint } = computePeriodSplit(
            points,
            Date.now() - CHART_CONFIG[period].fullPeriodLength,
            fractions
        );

        return {
            points,
            elegantPrices: elegantPrices ?? [],
            fullPath: pointsToSvgPath(points),
            fadedPath: splitIndex > 0 ? pointsToSvgPath(points.slice(0, splitIndex + 1)) : '',
            mainPath: pointsToSvgPath(points.slice(splitIndex > 0 ? splitIndex : 0)),
            splitPoint,
            lastPoint: points[points.length - 1]
        };
    }, [size, prices, period, startDate]);

    const [crosshair, setCrosshair] = useState<Crosshair | null>(null);

    const clear = useCallback(() => {
        downIndex.current = null;
        crosshairRef.current = null;
        setCrosshair(null);
        onActiveChange(null);
    }, [onActiveChange]);

    useEffect(() => clear(), [geometry, clear]);

    const emit = useCallback(
        (primary: number, secondary: number | null) => {
            if (geometry === null) return;

            const point = geometry.points[primary];
            if (point === undefined) {
                onActiveChange(null);
                return;
            }

            const format = dateFormatter(CHART_CONFIG[period].crosshairDateFormat);
            const other = secondary === null ? undefined : geometry.points[secondary];

            if (other === undefined) {
                onActiveChange({
                    price: point.price,
                    priceDiff: null,
                    timeLabel: format.format(new Date(point.timestamp)),
                    anchorX: point.x
                });
                return;
            }

            const [start, end] =
                point.timestamp <= other.timestamp ? [point, other] : [other, point];
            const newer = point.timestamp >= other.timestamp ? point : other;

            onActiveChange({
                price: newer.price,
                priceDiff: priceChangePercent(start.price, end.price),
                timeLabel: `${format.format(new Date(start.timestamp))} — ${format.format(new Date(end.timestamp))}`,
                anchorX: (point.x + other.x) / 2
            });
        },
        [geometry, dateFormatter, period, onActiveChange]
    );

    const update = useCallback(
        (offsetX: number, isDown: boolean) => {
            if (geometry === null) return;

            const index = nearestPointIndex(geometry.points, offsetX);
            if (index === -1) return;

            const secondary =
                isDown && downIndex.current !== null && downIndex.current !== index
                    ? downIndex.current
                    : null;

            const previous = crosshairRef.current;
            if (
                previous !== null &&
                previous.primary === index &&
                previous.secondary === secondary
            ) {
                return;
            }

            const next = { primary: index, secondary };
            crosshairRef.current = next;
            setCrosshair(next);
            emit(index, secondary);
        },
        [geometry, emit]
    );

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
        if (geometry === null || event.button !== 0) return;

        event.currentTarget.setPointerCapture(event.pointerId);
        downIndex.current = nearestPointIndex(geometry.points, event.nativeEvent.offsetX);
        update(event.nativeEvent.offsetX, true);
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
        update(event.nativeEvent.offsetX, event.buttons === 1);
    };

    const band = useMemo(() => {
        if (geometry === null || crosshair === null) return null;

        const primary = geometry.points[crosshair.primary];
        if (primary === undefined) return null;

        const secondary =
            crosshair.secondary === null ? undefined : geometry.points[crosshair.secondary];
        if (secondary === undefined) {
            return { x: 0, width: primary.x };
        }

        const min = Math.min(primary.x, secondary.x);
        const max = Math.max(primary.x, secondary.x);
        return { x: min, width: max - min };
    }, [geometry, crosshair]);

    const isActive = crosshair !== null && band !== null;

    return (
        <div
            ref={ref}
            className={plotStyles}
            role="img"
            aria-label={t('chart.a11yLabel')}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={clear}
            onPointerLeave={clear}
            onPointerCancel={clear}
        >
            {geometry !== null && (
                <>
                    <svg
                        className={svgStyles}
                        width={size.width}
                        height={size.height}
                        aria-hidden="true"
                    >
                        {geometry.elegantPrices.slice(1, 3).map((item, index) => (
                            <line
                                key={`ref-${index}`}
                                className={refLineStyles}
                                x1={0}
                                x2={size.width}
                                y1={item.y}
                                y2={item.y}
                            />
                        ))}

                        {isActive ? (
                            <>
                                <path
                                    className={fadedLineStyles}
                                    d={geometry.fullPath}
                                    fill="none"
                                />
                                <clipPath id={BRIGHT_CLIP_ID}>
                                    <rect
                                        x={band.x}
                                        y={0}
                                        width={band.width}
                                        height={size.height}
                                    />
                                </clipPath>
                                <path
                                    className={mainLineStyles}
                                    d={geometry.fullPath}
                                    fill="none"
                                    clipPath={`url(#${BRIGHT_CLIP_ID})`}
                                />
                                {[crosshair.primary, crosshair.secondary]
                                    .filter(
                                        (index): index is number =>
                                            index !== null && geometry.points[index] !== undefined
                                    )
                                    .map(index => {
                                        const point = geometry.points[index];
                                        return (
                                            <g key={index}>
                                                <line
                                                    className={crosshairLineStyles}
                                                    x1={point.x}
                                                    x2={point.x}
                                                    y1={0}
                                                    y2={size.height}
                                                />
                                                <circle
                                                    className={dotStyles}
                                                    cx={point.x}
                                                    cy={point.y}
                                                    r={3}
                                                />
                                            </g>
                                        );
                                    })}
                            </>
                        ) : (
                            <>
                                {geometry.fadedPath !== '' && (
                                    <path
                                        className={fadedLineStyles}
                                        d={geometry.fadedPath}
                                        fill="none"
                                    />
                                )}
                                <path
                                    className={mainLineStyles}
                                    d={geometry.mainPath}
                                    fill="none"
                                />
                                {geometry.splitPoint !== undefined && (
                                    <circle
                                        className={dotStyles}
                                        cx={geometry.splitPoint.x}
                                        cy={geometry.splitPoint.y}
                                        r={3}
                                    />
                                )}
                            </>
                        )}
                    </svg>

                    <div className={legendStyles}>
                        {geometry.elegantPrices
                            .slice(0, 3)
                            .filter(item => item.shouldBeRendered)
                            .map(item => (
                                <span
                                    key={item.price}
                                    className={legendLabelStyles}
                                    style={{ top: `${item.y}px` }}
                                >
                                    {formatCompactPrice(item.price)}
                                </span>
                            ))}
                    </div>

                    {!isActive && geometry.lastPoint !== undefined && (
                        <span
                            className={liveDotStyles}
                            style={{
                                left: `${geometry.lastPoint.x}px`,
                                top: `${geometry.lastPoint.y}px`
                            }}
                        />
                    )}
                </>
            )}
        </div>
    );
};
