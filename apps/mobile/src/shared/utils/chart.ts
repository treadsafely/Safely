import { Skia, type SkPath } from '@shopify/react-native-skia';

import type { ChartPoint } from '@safely/ux';

export { buildChartPoints, formatCompactPrice } from '@safely/ux';
export type { ChartPoint } from '@safely/ux';

export const buildChartPath = (points: ChartPoint[]): SkPath => {
    const builder = Skia.PathBuilder.Make();
    points.forEach((value, index) => {
        if (index === 0) {
            builder.moveTo(value.x, value.y);
        } else {
            builder.lineTo(value.x, value.y);
        }
    });

    return builder.build();
};
