import type { FC } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

import { CHART_CONFIG, useDateFormatter, type ChartPeriod } from '@safely/ux';
import { cx } from '@safely/web-ui/styled-system/css';

import {
    activeTimeStyles,
    datesHiddenStyles,
    datesRowStyles,
    footerDateCellStyles,
    footerDateStyles,
    footerDatesStyles,
    footerStyles,
    tickLargeStyles,
    tickMediumStyles,
    tickMediumTertiaryStyles,
    tickSmallStyles,
    ticksStyles
} from './Chart.styles';
import type { ChartActive } from './types';
import { Text } from '../../shared';

const Ticks: FC<{ period: ChartPeriod }> = ({ period }) => {
    const { tickConfig } = CHART_CONFIG[period];

    return (
        <div className={ticksStyles}>
            {Array.from({ length: tickConfig.count }, (_, index) => {
                const variant = tickConfig.tick(index);
                const className =
                    variant === 'large'
                        ? tickLargeStyles
                        : variant === 'medium'
                          ? tickConfig.mediumTickColor === 'tertiary'
                              ? tickMediumTertiaryStyles
                              : tickMediumStyles
                          : tickSmallStyles;

                return <span key={index} className={className} />;
            })}
        </div>
    );
};

export type ChartFooterProps = {
    period: ChartPeriod;
    startDate: number;
    active: ChartActive | null;
};

export const ChartFooter: FC<ChartFooterProps> = props => {
    const { period, startDate, active } = props;

    const dateFormatter = useDateFormatter();
    const formatter = dateFormatter(CHART_CONFIG[period].footerDateFormat);
    const dates = CHART_CONFIG[period].getPeriodIntermediatePoints(startDate).slice(0, -1);

    const wrapRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLSpanElement>(null);
    const [labelCenter, setLabelCenter] = useState(0);

    useLayoutEffect(() => {
        if (active === null) return;

        const containerWidth = wrapRef.current?.offsetWidth ?? 0;
        const labelWidth = labelRef.current?.offsetWidth ?? 0;
        const half = labelWidth / 2;

        setLabelCenter(Math.max(half, Math.min(active.anchorX, containerWidth - half)));
    }, [active]);

    return (
        <div className={footerStyles}>
            <Ticks period={period} />
            <div ref={wrapRef} className={footerDatesStyles}>
                <div className={cx(datesRowStyles, active !== null && datesHiddenStyles)}>
                    {dates.map((date, index) => (
                        <div key={index} className={footerDateCellStyles}>
                            <Text variant="bodyS" tone="tertiary" className={footerDateStyles}>
                                {formatter.format(new Date(date))}
                            </Text>
                        </div>
                    ))}
                </div>
                {active !== null && (
                    <span
                        ref={labelRef}
                        className={activeTimeStyles}
                        style={{ left: `${labelCenter}px` }}
                    >
                        {active.timeLabel}
                    </span>
                )}
            </div>
        </div>
    );
};
