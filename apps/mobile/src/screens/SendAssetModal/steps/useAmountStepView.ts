import { useMemo } from 'react';

import type { NumberFormatter } from '@safely/core';
import { SendFormError, hasFiatPrice, resolveAmountDecimals, type AmountView } from '@safely/ux';

interface UseAmountStepViewParams {
    view: AmountView;
    formatter: NumberFormatter;
    fiatSymbol: string;
}

export function useAmountStepView(params: UseAmountStepViewParams) {
    const { view, formatter, fiatSymbol } = params;

    const asset = view.parsed.asset;
    const inputType = view.values.amountInputType;
    const decimals = resolveAmountDecimals(inputType, asset);
    const hasPrice = hasFiatPrice(asset);
    const rawAmountError = view.errors.amount;
    const amountError =
        rawAmountError === SendFormError.INSUFFICIENT_BALANCE ||
        rawAmountError === SendFormError.UNRECOGNIZED_AMOUNT
            ? rawAmountError
            : undefined;
    const isMax = view.status === 'max';

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
        if (!asset) return '0 BTC';

        const totalBalance = asset.amount;
        const usedAmount = view.parsed.amount?.cryptoAssetAmount;

        if (!usedAmount) return totalBalance.format(formatter);

        const remaining = totalBalance.relativeAmount.minus(usedAmount.relativeAmount);
        if (remaining.lt(0)) return totalBalance.amountMul(0).format(formatter);

        return totalBalance
            .amountSub({ relativeAmount: usedAmount.relativeAmount })
            .format(formatter);
    }, [asset, view.parsed.amount, formatter]);

    return {
        decimals,
        hasPrice,
        amountError,
        isMax,
        inputType,
        alternativeAmount,
        remainingBalance
    };
}
