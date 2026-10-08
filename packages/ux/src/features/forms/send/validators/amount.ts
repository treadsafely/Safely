import type { BtcAsset, CryptoAsset, NumberFormatter, RatedCryptoAssetAmount } from '@safely/core';
import { BTC_ASSET, CryptoAssetAmount, FiatAssetAmount } from '@safely/core';

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

    if (!price) {
        return null;
    }

    const decimals = resolveAmountDecimals(inputType, asset);
    const { formatted, parsed: parsedAmount } = formatter.parseInput(value, decimals);

    if (inputType === 'crypto') {
        const cryptoAssetAmount = new CryptoAssetAmount({
            asset: amount.asset,
            relativeAmount: parsedAmount
        });
        const fiatAssetAmount = cryptoAssetAmount.convert(price);

        return {
            formatted,
            parsed: {
                inputType: 'crypto',
                cryptoAssetAmount,
                fiatAssetAmount
            }
        };
    } else {
        const fiatAssetAmount = new FiatAssetAmount({
            asset: price.quote,
            amount: parsedAmount
        });
        const cryptoAssetAmount = fiatAssetAmount.convert<CryptoAsset>(price);

        return {
            formatted,
            parsed: {
                inputType: 'fiat',
                cryptoAssetAmount,
                fiatAssetAmount
            }
        };
    }
}

export function formatAmountForDisplay(
    inputType: AmountInputType,
    fiatAssetAmount: FiatAssetAmount,
    cryptoAssetAmount: CryptoAssetAmount,
    formatter: NumberFormatter
): string {
    return inputType === 'fiat'
        ? formatter.formatAssetAmount(fiatAssetAmount, {
              currencyDisplay: 'none',
              useGrouping: false
          })
        : formatter.formatAssetAmount(cryptoAssetAmount, {
              currencyDisplay: 'none',
              fullPrecision: true,
              useGrouping: false
          });
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
    if (!asset.price) {
        return null;
    }

    const fiatAssetAmount = asset.amount.convert(asset.price);
    const formatted = formatAmountForDisplay(inputType, fiatAssetAmount, asset.amount, formatter);

    return {
        formatted,
        parsed: {
            inputType,
            cryptoAssetAmount: asset.amount,
            fiatAssetAmount
        }
    };
}

export function reformatForInputType(
    currentParsed: AmountWithInputType<CryptoAsset>,
    newInputType: AmountInputType,
    formatter: NumberFormatter
): AmountWithOutputType {
    const formatted = formatAmountForDisplay(
        newInputType,
        currentParsed.fiatAssetAmount,
        currentParsed.cryptoAssetAmount,
        formatter
    );

    return {
        formatted,
        parsed: {
            inputType: newInputType,
            cryptoAssetAmount: currentParsed.cryptoAssetAmount,
            fiatAssetAmount: currentParsed.fiatAssetAmount
        }
    };
}
