import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { removeStaleChartQueries } from '../../../src/entities/asset/chart-cache';
import { assetKeys } from '../../../src/entities/asset/keys';
import { ChartPeriod, chartStartDate } from '../../../src/shared';

function chartKey(assetId: string, fiatId: string, startDate: number) {
    return assetKeys.chart(assetId).fiat(fiatId).startDate(startDate.toString()).toKey();
}

describe('removeStaleChartQueries', () => {
    it('drops only series whose start date no period uses any more', () => {
        const client = new QueryClient();
        const hourStart = chartStartDate(ChartPeriod.ONE_HOUR);
        const monthStart = chartStartDate(ChartPeriod.ONE_MONTH);
        const stale = hourStart - 60 * 60 * 1000;
        const otherAssetStale = stale - 1;

        client.setQueryData(chartKey('btc', 'USD', hourStart), 1);
        client.setQueryData(chartKey('btc', 'EUR', monthStart), 2);
        client.setQueryData(chartKey('btc', 'USD', stale), 3);
        client.setQueryData(chartKey('other', 'USD', otherAssetStale), 4);

        removeStaleChartQueries(client, 'btc', hourStart);

        expect(client.getQueryData(chartKey('btc', 'USD', hourStart))).toBe(1);
        expect(client.getQueryData(chartKey('btc', 'EUR', monthStart))).toBe(2);
        expect(client.getQueryData(chartKey('btc', 'USD', stale))).toBeUndefined();
        expect(client.getQueryData(chartKey('other', 'USD', otherAssetStale))).toBe(4);
    });

    it('keeps the series being shown even when its start date just went stale', () => {
        const client = new QueryClient();
        const shown = chartStartDate(ChartPeriod.ONE_HOUR) - 60 * 60 * 1000;

        client.setQueryData(chartKey('btc', 'USD', shown), 1);
        removeStaleChartQueries(client, 'btc', shown);

        expect(client.getQueryData(chartKey('btc', 'USD', shown))).toBe(1);
    });
});
