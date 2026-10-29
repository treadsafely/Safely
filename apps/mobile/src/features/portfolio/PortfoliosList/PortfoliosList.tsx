import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useCallback } from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import type { Portfolio } from '@safely/core';
import { PortfolioType } from '@safely/core';
import {
    isDerivableEntities,
    isDerivablePortfolio,
    useActivePortfolioEntities,
    useReorderPortfolios,
    useSetActivePortfolio
} from '@safely/ux';

import { useReorderEngine } from '@mobile/shared/ui';

import { DraggablePortfolio } from './components';
import { ROW_HEIGHT } from './constants';

interface PortfoliosListProps {
    portfolios: Portfolio[];
    onSelect: () => void;
    onCustomize?: () => void;
    variant?: 'compact';
}

const estimateHeight = (portfolio: Portfolio): number => {
    const count = isDerivablePortfolio(portfolio) ? portfolio.getDerivations().length : 1;
    const isGroup = portfolio.type === PortfolioType.LEDGER || count > 1;

    return isGroup ? ROW_HEIGHT * (count + 1) : ROW_HEIGHT;
};

const buildHeights = (
    portfolios: Portfolio[],
    measured: Record<string, number>
): Record<string, number> => {
    const heights: Record<string, number> = {};

    portfolios.forEach(portfolio => {
        const id = portfolio.id.toString();
        heights[id] = measured[id] ?? estimateHeight(portfolio);
    });

    return heights;
};

export const PortfoliosList = (props: PortfoliosListProps) => {
    const { portfolios, onSelect, variant } = props;
    const { mutate: reorderPortfolios } = useReorderPortfolios();
    const { mutate: setActivePortfolio } = useSetActivePortfolio();

    const active = useActivePortfolioEntities();
    const activePortfolioId = active.portfolio.id;
    const activeDerivationIndex = isDerivableEntities(active) ? active.derivation.index : undefined;

    const gap = variant === 'compact' ? 0 : 2;
    const itemsCount = portfolios.length;

    const ids = portfolios.map(p => p.id.toString());
    const engine = useReorderEngine(
        ids,
        useCallback((prev: Record<string, number>) => buildHeights(portfolios, prev), [portfolios])
    );
    const { heights } = engine;

    const handleSelect = useCallback(
        (portfolio: Portfolio, derivationIndex?: number) => {
            void impactAsync(ImpactFeedbackStyle.Medium);
            onSelect();
            requestAnimationFrame(() => setActivePortfolio({ id: portfolio.id, derivationIndex }));
        },
        [setActivePortfolio, onSelect]
    );

    const handleReorder = useCallback(
        (nextOrderIds: string[]) => {
            if (nextOrderIds.length !== portfolios.length) return;

            const byId = new Map(portfolios.map(p => [p.id.toString(), p]));
            const next = nextOrderIds.map(id => byId.get(id)).filter(p => p !== undefined);

            reorderPortfolios(next);
        },
        [portfolios, reorderPortfolios]
    );

    const handleMeasure = useCallback(
        (id: string, height: number) => {
            if (height > 0 && heights.value[id] !== height) {
                heights.value = { ...heights.value, [id]: height };
            }
        },
        [heights]
    );

    const containerStyle = useAnimatedStyle(() => {
        let sum = 0;

        for (const key in heights.value) {
            sum += heights.value[key];
        }

        return {
            height: itemsCount > 0 ? sum + (itemsCount - 1) * gap : 0
        };
    });

    return (
        <Animated.View style={containerStyle}>
            {portfolios.map((portfolio, index) => {
                return (
                    <DraggablePortfolio
                        key={portfolio.id.toString()}
                        portfolio={portfolio}
                        index={index}
                        itemsCount={itemsCount}
                        gap={gap}
                        engine={engine}
                        activePortfolioId={activePortfolioId}
                        activeDerivationIndex={activeDerivationIndex}
                        onReorder={handleReorder}
                        onMeasure={handleMeasure}
                        handleSelect={handleSelect}
                        variant={variant}
                    />
                );
            })}
        </Animated.View>
    );
};
