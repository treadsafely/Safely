import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import type { FC } from 'react';

import { ChartPeriod, useTranslate } from '@safely/ux';

import { periodButtonStyles, periodsStyles } from './Chart.styles';

export type ChartPeriodsProps = {
    value: ChartPeriod;
    onChange: (period: ChartPeriod) => void;
};

export const ChartPeriods: FC<ChartPeriodsProps> = ({ value, onChange }) => {
    const t = useTranslate();

    return (
        <ToggleGroup
            value={[value]}
            onValueChange={groupValue => {
                const next = groupValue[0];
                if (next !== undefined) onChange(next as ChartPeriod);
            }}
            className={periodsStyles}
        >
            {Object.values(ChartPeriod).map(period => (
                <Toggle key={period} value={period} className={periodButtonStyles}>
                    {t(`chart.periods.${period}`)}
                </Toggle>
            ))}
        </ToggleGroup>
    );
};
