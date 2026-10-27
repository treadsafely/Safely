import type {
    BtcAsset,
    CryptoAsset,
    FlameAsset,
    NumberFormatter,
    RatedCryptoAssetAmount
} from '@safely/core';
import { BTC_ASSET, CryptoAssetAmount, FiatAssetAmount, FLAME_ASSET } from '@safely/core';

import { SendFormError } from '../errors';
import type {
    AmountInputType,
    AmountValidationResult,
    AmountWithInputType,
    AmountWithOutputType
} from '../types';
import { DEFAULT_FIAT_DECIMALS } from '../utils';

export function isBtcAmountWithInputType(
    amount: AmountWithInputType<CryptoAsset>
): amount is AmountWithInputType<BtcAsset> {
    return amount.cryptoAssetAmount.asset.id.isEq(BTC_ASSET.id);
}

export function isFlameAmountWithInputType(
    amount: AmountWithInputType<CryptoAsset>
): amount is AmountWithInputType<FlameAsset> {
    return amount.cryptoAssetAmount.asset.id.isEq(FLAME_ASSET.id);
}

// a zero price blocks fiat input too: a fiat amount can't be converted into the asset
export function hasFiatPrice(asset: RatedCryptoAssetAmount | undefined): boolean {
    return !!asset?.price && !asset.price.value.eq(0);
}

// TODO CRITICAL for multichain: Get rid of default decimals
export function resolveAmountDecimals(
    inputType: AmountInputType,
    asset: RatedCryptoAssetAmount | undefined
): number {
    if (inputType === 'fiat') return DEFAULT_FIAT_DECIMALS;

    return asset?.amount.asset.decimals ?? BTC_ASSET.decimals;
}

export function formatAmount(
    value: string,
    inputType: AmountInputType,
    asset: RatedCryptoAssetAmount,
    formatter: NumberFormatter
): AmountWithOutputType | null {
    const { amount, price } = asset;
    const decimals = resolveAmountDecimals(inputType, asset);
    const { formatted, parsed: parsedAmount } = formatter.parseInput(value, decimals);

    if (inputType === 'crypto') {
        const cryptoAssetAmount = new CryptoAssetAmount({
            asset: amount.asset,
            relativeAmount: parsedAmount
        });

        return {
            formatted,
            parsed: {
                inputType: 'crypto',
                cryptoAssetAmount,
                fiatAssetAmount: price && cryptoAssetAmount.convert(price)
            }
        };
    }

    if (!price) {
        return null;
    }

    const fiatAssetAmount = new FiatAssetAmount({
        asset: price.quote,
        amount: parsedAmount
    });

    return {
        formatted,
        parsed: {
            inputType: 'fiat',
            cryptoAssetAmount: fiatAssetAmount.convert<CryptoAsset>(price),
            fiatAssetAmount
        }
    };
}

export function formatAmountForDisplay(
    parsed: AmountWithInputType<CryptoAsset>,
    formatter: NumberFormatter
): string {
    return parsed.inputType === 'fiat'
        ? formatter.formatAssetAmount(parsed.fiatAssetAmount, {
              currencyDisplay: 'none',
              useGrouping: false
          })
        : formatter.formatAssetAmount(parsed.cryptoAssetAmount, {
              currencyDisplay: 'none',
              fullPrecision: true,
              useGrouping: false
          });
}

function withInputType(
    inputType: AmountInputType,
    cryptoAssetAmount: CryptoAssetAmount,
    fiatAssetAmount: FiatAssetAmount | null
): AmountWithInputType<CryptoAsset> | null {
    if (inputType === 'crypto') {
        return { inputType, cryptoAssetAmount, fiatAssetAmount };
    }

    return fiatAssetAmount && { inputType, cryptoAssetAmount, fiatAssetAmount };
}

export function validateAmount(
    value: string,
    inputType: AmountInputType,
    asset: RatedCryptoAssetAmount | undefined,
    formatter: NumberFormatter
): AmountValidationResult {
    if (value === '') {
        return {
            formatted: '',
            parsed: undefined,
            error: undefined
        };
    }

    if (!asset) {
        return {
            formatted: value,
            parsed: undefined,
            error: SendFormError.SELECT_TOKEN_FIRST
        };
    }

    try {
        const result = formatAmount(value, inputType, asset, formatter);

        if (!result) {
            return {
                formatted: value,
                parsed: undefined,
                error: SendFormError.INVALID_AMOUNT
            };
        }

        if (result.parsed.cryptoAssetAmount.relativeAmount.eq(0)) {
            return {
                ...result,
                error: SendFormError.INVALID_AMOUNT
            };
        }

        if (result.parsed.cryptoAssetAmount.gt(asset.amount)) {
            return {
                ...result,
                error: SendFormError.INSUFFICIENT_BALANCE
            };
        }

        return {
            ...result,
            error: undefined
        };
    } catch {
        return {
            formatted: value,
            parsed: undefined,
            error: SendFormError.INVALID_AMOUNT
        };
    }
}

export function calculateMaxAmount(
    asset: RatedCryptoAssetAmount,
    inputType: AmountInputType,
    formatter: NumberFormatter
): AmountWithOutputType | null {
    const fiatAssetAmount = asset.price && asset.amount.convert(asset.price);
    const parsed = withInputType(inputType, asset.amount, fiatAssetAmount);

    return parsed && { formatted: formatAmountForDisplay(parsed, formatter), parsed };
}

export function reformatForInputType(
    currentParsed: AmountWithInputType<CryptoAsset>,
    newInputType: AmountInputType,
    formatter: NumberFormatter
): AmountWithOutputType | null {
    const parsed = withInputType(
        newInputType,
        currentParsed.cryptoAssetAmount,
        currentParsed.fiatAssetAmount
    );

    return parsed && { formatted: formatAmountForDisplay(parsed, formatter), parsed };
}
