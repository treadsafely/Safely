import { useMemo } from 'react';

import type { NumberFormatter } from '@safely/core';

import { SendFormError } from './errors';
import type { AmountInputType } from './types';
import { resolveAmountDecimals } from './validators';
import type { AmountView } from './view';

export interface AmountStepView {
    decimals: number;
    hasPrice: boolean;
    amountError: SendFormError | undefined;
    isMax: boolean;
    inputType: AmountInputType;
    alternativeAmount: string;
    remainingBalance: string;
}

export interface UseAmountStepViewParams {
    view: AmountView;
    formatter: NumberFormatter;
    fiatSymbol: string;
}

export function useAmountStepView(params: UseAmountStepViewParams): AmountStepView {
    const { view, formatter, fiatSymbol } = params;

    const asset = view.parsed.asset;
    const inputType = view.values.amountInputType;
    const rawError = view.errors.amount;

    const alternativeAmount = useMemo(() => {
        const parsedAmount = view.parsed.amount;
        const cryptoSymbol = asset?.amount.asset.symbol ?? 'BTC';

        if (!parsedAmount) {
            return inputType === 'crypto' ? `0 ${fiatSymbol}` : `0 ${cryptoSymbol}`;
        }

        if (inputType === 'crypto') {
            const fiat = parsedAmount.fiatAssetAmount;

            return fiat ? fiat.format(formatter, { currencyDisplay: 'code' }) : `0 ${fiatSymbol}`;
        }

        return parsedAmount.cryptoAssetAmount.format(formatter);
    }, [view.parsed.amount, inputType, asset, formatter, fiatSymbol]);

    const remainingBalance = useMemo(() => {
        if (!asset) {
            return '0 BTC';
        }

        const totalBalance = asset.amount;
        const usedAmount = view.parsed.amount?.cryptoAssetAmount;

        if (!usedAmount) {
            return totalBalance.format(formatter);
        }

        const remaining = totalBalance.relativeAmount.minus(usedAmount.relativeAmount);

        if (remaining.lt(0)) {
            return totalBalance.amountMul(0).format(formatter);
        }

        return totalBalance
            .amountSub({ relativeAmount: usedAmount.relativeAmount })
            .format(formatter);
    }, [asset, view.parsed.amount, formatter]);

    return {
        decimals: resolveAmountDecimals(inputType, asset),
        hasPrice: !!asset?.price,
        amountError:
            rawError === SendFormError.INSUFFICIENT_BALANCE ||
            rawError === SendFormError.UNRECOGNIZED_AMOUNT
                ? rawError
                : undefined,
        isMax: view.status === 'max',
        inputType,
        alternativeAmount,
        remainingBalance
    };
}
