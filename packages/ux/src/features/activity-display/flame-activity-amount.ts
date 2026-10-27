import type { FlameHistoryItem, NumberFormatter } from '@safely/core';

import { resolveSentAmount } from '../amount-display';

const UNREADABLE_AMOUNT = '–';

export type FlameActivityAmountView = {
    amountSign: '+' | '−' | null;
    formattedValue: string;
};

export function buildFlameActivityAmountView(
    activity: Pick<FlameHistoryItem, 'isInitiator' | 'value' | 'fee' | 'hasUnreadableOutputs'>,
    context: { numberFormatter: NumberFormatter; showFullSentAmount: boolean }
): FlameActivityAmountView {
    if (activity.hasUnreadableOutputs) {
        return { amountSign: null, formattedValue: UNREADABLE_AMOUNT };
    }

    const { amount, isFullPrecision } = resolveSentAmount({
        isInitiator: activity.isInitiator,
        value: activity.value,
        fee: activity.fee ?? undefined,
        showFullSentAmount: context.showFullSentAmount
    });

    return {
        amountSign: activity.isInitiator ? '−' : '+',
        formattedValue: amount.format(context.numberFormatter, { fullPrecision: isFullPrecision })
    };
}
