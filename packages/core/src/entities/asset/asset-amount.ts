import type { BigSource } from 'big.js';
import Big from 'big.js';
import * as z from 'zod';

import { sFiatAsset } from '@safely/sync-storage';

import type { CryptoAsset } from './crypto-asset';
import { isCryptoAsset, sCryptoAsset } from './crypto-asset';
import { FiatAsset } from './fiat-asset';
import { isFiatAsset } from './fiat-asset';
import type { IAsset } from './I-asset';
import type { Rate } from './rate';
import { sCryptoFiatRate } from './rate';
import type { CryptoCurrencyDisplay, FiatCurrencyDisplay, NumberFormatter } from '../../utils';
import { isZero, toBig, toBigInt } from '../../utils';

type AssetAmountByAsset<T extends IAsset> = T extends CryptoAsset
    ? CryptoAssetAmount<T>
    : T extends FiatAsset
      ? FiatAssetAmount<T>
      : BaseAssetAmount<T>;

function convertToAssetAmount<T extends IAsset>({
    asset,
    amount
}: {
    amount: BigSource;
    asset: T;
}): AssetAmountByAsset<T> {
    if (isCryptoAsset(asset)) {
        return new CryptoAssetAmount({
            asset,
            relativeAmount: Big(amount).round(asset.decimals, 0)
        }) as unknown as AssetAmountByAsset<T>;
    }

    if (isFiatAsset(asset)) {
        return new FiatAssetAmount({ asset, amount }) as unknown as AssetAmountByAsset<T>;
    }

    return new AssetAmount({ asset, amount }) as unknown as AssetAmountByAsset<T>;
}

abstract class BaseAssetAmount<T extends IAsset = IAsset> {
    protected abstract comparableAmount: Big;

    protected abstract convertableAmount: Big;

    protected abstract asset: T;

    public eq(assetAmount: BaseAssetAmount): boolean {
        this.checkIfCanCompareCurrencies(assetAmount);
        return this.comparableAmount.eq(assetAmount.comparableAmount);
    }

    public gt(assetAmount: BaseAssetAmount): boolean {
        this.checkIfCanCompareCurrencies(assetAmount);
        return this.comparableAmount.gt(assetAmount.comparableAmount);
    }

    public gte(assetAmount: BaseAssetAmount): boolean {
        this.checkIfCanCompareCurrencies(assetAmount);
        return this.comparableAmount.gte(assetAmount.comparableAmount);
    }

    public lt(assetAmount: BaseAssetAmount): boolean {
        this.checkIfCanCompareCurrencies(assetAmount);
        return this.comparableAmount.lt(assetAmount.comparableAmount);
    }

    public lte(assetAmount: BaseAssetAmount): boolean {
        this.checkIfCanCompareCurrencies(assetAmount);
        return this.comparableAmount.lte(assetAmount.comparableAmount);
    }

    protected checkIfCanCompareCurrencies(assetAmount: BaseAssetAmount): never | void {
        if (!assetAmount.asset.id.isEq(this.asset.id)) {
            throw new Error(
                `Can't compare ${this.asset.id.toString()} and ${assetAmount.asset.id.toString()} amounts because they have different currencies types.`
            );
        }
    }

    public convert<R extends IAsset>(rate: Rate<T, R> | Rate<R, T>): AssetAmountByAsset<R> {
        if (rate.base.id.isEq(this.asset.id)) {
            return convertToAssetAmount({
                asset: rate.quote as R,
                amount: this.convertableAmount.mul(rate.value)
            });
        } else {
            if (isZero(rate.value)) {
                throw new Error('Division by zero');
            }
            return convertToAssetAmount({
                asset: rate.base as R,
                amount: this.convertableAmount.div(rate.value)
            });
        }
    }
}

export class AssetAmount<T extends IAsset = IAsset> extends BaseAssetAmount<T> {
    public readonly amount: Big;

    public readonly asset: T;

    protected get comparableAmount() {
        return this.amount;
    }

    protected get convertableAmount() {
        return this.amount;
    }

    constructor({ amount, asset }: { amount: BigSource; asset: T }) {
        super();
        this.amount = Big(amount);
        this.asset = asset;
    }

    public amountMul(operand: BigSource): BaseAssetAmount<T> {
        return new AssetAmount({
            asset: this.asset,
            amount: this.amount.mul(operand)
        });
    }

    public amountDiv(operand: BigSource): BaseAssetAmount<T> {
        if (isZero(operand)) {
            throw new Error('Division by zero');
        }

        return new AssetAmount({
            asset: this.asset,
            amount: this.amount.div(operand)
        });
    }

    public amountAdd(operand: BigSource): BaseAssetAmount<T> {
        return new AssetAmount({
            asset: this.asset,
            amount: this.amount.add(operand)
        });
    }

    public amountSub(operand: BigSource): BaseAssetAmount<T> {
        return new AssetAmount({
            asset: this.asset,
            amount: this.amount.sub(operand)
        });
    }
}

export const sFiatAssetAmount = z
    .object({
        asset: sFiatAsset,
        amount: z.string()
    })
    .transform(
        val =>
            new FiatAssetAmount({
                asset: FiatAsset.restore(val.asset),
                amount: val.amount
            })
    );
export class FiatAssetAmount<T extends FiatAsset = FiatAsset> extends AssetAmount<T> {
    declare public readonly asset: T;

    public format(
        formatter: NumberFormatter,
        options?: {
            fullPrecision?: boolean;
            showPositiveSign?: boolean;
            currencyDisplay?: FiatCurrencyDisplay;
        }
    ): string {
        return formatter.formatAssetAmount(this, options);
    }

    public amountMul(operand: BigSource): FiatAssetAmount<T> {
        return new FiatAssetAmount<T>({
            asset: this.asset,
            amount: this.amount.mul(operand)
        });
    }

    public amountDiv(operand: BigSource): FiatAssetAmount<T> {
        return new FiatAssetAmount({
            asset: this.asset,
            amount: this.amount.div(operand)
        });
    }

    public amountAdd(operand: BigSource): FiatAssetAmount<T> {
        return new FiatAssetAmount({
            asset: this.asset,
            amount: this.amount.add(operand)
        });
    }

    public amountSub(operand: BigSource): FiatAssetAmount<T> {
        return new FiatAssetAmount({
            asset: this.asset,
            amount: this.amount.sub(operand)
        });
    }

    public add(assetAmount: FiatAssetAmount<T>): FiatAssetAmount<T> {
        this.checkIfCanCompareCurrencies(assetAmount);
        return this.amountAdd(assetAmount.amount);
    }

    public sub(assetAmount: FiatAssetAmount<T>): FiatAssetAmount<T> {
        this.checkIfCanCompareCurrencies(assetAmount);
        return this.amountSub(assetAmount.amount);
    }

    public toJSON(): z.input<typeof sFiatAssetAmount> {
        return {
            asset: this.asset.toJSON(),
            amount: this.amount.toJSON()
        };
    }
}

export const sCryptoAssetAmount = z
    .object({
        asset: sCryptoAsset,
        weiAmount: z.string()
    })
    .transform(
        val =>
            new CryptoAssetAmount({
                asset: val.asset,
                weiAmount: val.weiAmount
            })
    );
export type SCryptoAssetAmount = z.infer<typeof sCryptoAssetAmount>;
export class CryptoAssetAmount<T extends CryptoAsset = CryptoAsset> extends BaseAssetAmount<T> {
    public readonly asset: T;

    public readonly weiAmount: bigint;

    public readonly relativeAmount: Big;

    protected get comparableAmount() {
        return this.relativeAmount;
    }

    protected get convertableAmount() {
        return this.relativeAmount;
    }

    constructor(
        params:
            { relativeAmount: BigSource; asset: T } | { weiAmount: bigint | string | Big; asset: T }
    ) {
        const asset = params.asset;

        let relativeAmount: BigSource;
        let weiAmount: bigint;
        if ('relativeAmount' in params) {
            relativeAmount = params.relativeAmount;

            weiAmount = toBigInt(Big(relativeAmount).mul(Big(10).pow(asset.decimals)));
        } else {
            weiAmount = toBigInt(params.weiAmount);
            relativeAmount = Big(weiAmount.toString()).div(Big(10).pow(asset.decimals));
        }

        if (weiAmount < 0) {
            throw new Error('Crypto asset amount cannot be negative');
        }

        super();
        this.asset = params.asset;
        this.relativeAmount = toBig(relativeAmount);
        this.weiAmount = weiAmount;
    }

    public format(
        formatter: NumberFormatter,
        options?: {
            fullPrecision?: boolean;
            currencyDisplay?: CryptoCurrencyDisplay;
            showPositiveSign?: boolean;
        }
    ): string {
        return formatter.formatAssetAmount(this, options);
    }

    public amountMul(operand: BigSource | bigint): CryptoAssetAmount<T> {
        return new CryptoAssetAmount({
            asset: this.asset,
            relativeAmount: this.relativeAmount.mul(toBig(operand))
        });
    }

    public amountDiv(operand: BigSource | bigint): CryptoAssetAmount<T> {
        if (isZero(operand)) {
            throw new Error('Division by zero');
        }
        return new CryptoAssetAmount({
            asset: this.asset,
            relativeAmount: this.relativeAmount.div(toBig(operand))
        });
    }

    public amountAdd(
        operand: { relativeAmount: BigSource } | { weiAmount: bigint | string | Big }
    ): CryptoAssetAmount<T> {
        if ('relativeAmount' in operand) {
            return new CryptoAssetAmount({
                asset: this.asset,
                relativeAmount: this.relativeAmount.add(operand.relativeAmount)
            });
        } else {
            return new CryptoAssetAmount({
                asset: this.asset,
                weiAmount: this.weiAmount + toBigInt(operand.weiAmount)
            });
        }
    }

    public amountSub(
        operand: { relativeAmount: BigSource } | { weiAmount: bigint | string | Big }
    ): CryptoAssetAmount<T> {
        if ('relativeAmount' in operand) {
            return new CryptoAssetAmount({
                asset: this.asset,
                relativeAmount: this.relativeAmount.sub(operand.relativeAmount)
            });
        } else {
            return new CryptoAssetAmount({
                asset: this.asset,
                weiAmount: this.weiAmount - toBigInt(operand.weiAmount)
            });
        }
    }

    public add(amount: CryptoAssetAmount<T>): CryptoAssetAmount<T> {
        this.checkIfCanCompareCurrencies(amount);
        return new CryptoAssetAmount({
            asset: this.asset,
            weiAmount: this.weiAmount + amount.weiAmount
        });
    }

    public sub(amount: CryptoAssetAmount<T>): CryptoAssetAmount<T> {
        this.checkIfCanCompareCurrencies(amount);
        return new CryptoAssetAmount({
            asset: this.asset,
            weiAmount: this.weiAmount - amount.weiAmount
        });
    }

    public toJSON(): z.input<typeof sCryptoAssetAmount> {
        return {
            asset: {
                ...this.asset,
                id: this.asset.id.toJSON()
            } as z.input<typeof sCryptoAsset>,
            weiAmount: this.weiAmount.toString()
        };
    }
}

export function isFiatAssetAmount(amount: unknown): amount is FiatAssetAmount {
    return amount instanceof FiatAssetAmount;
}

export function isCryptoAssetAmount(amount: unknown): amount is CryptoAssetAmount {
    return amount instanceof CryptoAssetAmount;
}

export const sRatedCryptoAssetAmount = z.object({
    price: sCryptoFiatRate,
    amount: sCryptoAssetAmount
});
export type RatedCryptoAssetAmount = z.output<typeof sRatedCryptoAssetAmount>;

export const sRatedCryptoAssetAmountArray = z.array(sRatedCryptoAssetAmount);
export type RatedCryptoAssetAmountArray = z.output<typeof sRatedCryptoAssetAmountArray>;
