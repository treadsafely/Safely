import { View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { BTC_ASSET } from '@safely/core';
import { useChart, useChartStartDate } from '@safely/ux';

import type { ChartPoint } from '@mobile/shared/utils/chart';

import { styles } from './Chart.styles';
import {
    ChartHeader,
    ChartLine,
    ChartPeriods,
    ChartFooter,
    ChartLineSkeleton,
    ProviderLabel
} from './components';
import { ChartPeriod } from './config';
import { useChartPeriodQuery, useSetChartPeriod, useCrosshair } from './hooks';

export const Chart = () => {
    const asset = BTC_ASSET;
    const { data: selectedPeriod = ChartPeriod.ONE_MONTH } = useChartPeriodQuery();
    const { mutate: setSelectedPeriod } = useSetChartPeriod();
    const chartPointsShared = useSharedValue<ChartPoint[]>([]);
    const pathFractionsShared = useSharedValue<number[]>([]);

    const startDate = useChartStartDate(selectedPeriod);
    const chart = useChart(asset, startDate);
    const crosshair = useCrosshair({ chartPointsShared, pathFractionsShared, selectedPeriod });

    const prices = chart.data?.prices ?? [];

    return (
        <View style={styles.container}>
            <ChartHeader
                prices={prices}
                asset={asset}
                selectedPeriod={selectedPeriod}
                activePrice={crosshair.activePrice}
                activePriceDiff={crosshair.activePriceDiff}
            />
            <ChartPeriods selectedPeriod={selectedPeriod} onSelectPeriod={setSelectedPeriod} />
            {chart.isLoading ? (
                <ChartLineSkeleton />
            ) : (
                <ChartLine
                    startDate={startDate}
                    prices={prices}
                    selectedPeriod={selectedPeriod}
                    chartPointsShared={chartPointsShared}
                    pathFractionsShared={pathFractionsShared}
                    primaryCrosshair={crosshair.primaryCrosshair}
                    secondaryCrosshair={crosshair.secondaryCrosshair}
                    gesture={crosshair.gesture}
                />
            )}
            <ChartFooter
                startDate={startDate}
                selectedPeriod={selectedPeriod}
                primaryCrosshair={crosshair.primaryCrosshair}
                isTimeLabelReady={crosshair.isTimeLabelReady}
                formattedTime={crosshair.formattedTime}
                secondaryCrosshair={crosshair.secondaryCrosshair}
            />
            {chart.data?.attribution?.label && (
                <ProviderLabel
                    label={chart.data?.attribution.label}
                    link={chart.data?.attribution.link}
                />
            )}
        </View>
    );
};
