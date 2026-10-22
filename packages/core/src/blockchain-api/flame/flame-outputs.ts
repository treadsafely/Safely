import type { FlameApiScanEntry } from '../../api/flame/models';
import { FlameAssetAmount } from '../../entities/asset/exact-crypto-assets-amounts';
import { FLAME_NATIVE_FLAVOR } from '../../entities/blockchain/flame/flame-network';
import type {
    FlameOutputAmount,
    FlameOutputBytes
} from '../../entities/derivation/flame/I-flame-wallet';

export interface FlameOutput {
    id: string;
    bytes: FlameOutputBytes;
    height: number;
    txid: string;
    spent: { height: number; txid: string } | null;
    amount: FlameOutputAmount;
}

export type FlameActivityItem = {
    txid: string;
    height: number;
    isInitiator: boolean;
    value: FlameAssetAmount;
    hasUnreadableOutputs: boolean;
    memo: string | null;
};

export function toFlameOutputBytes(entry: FlameApiScanEntry): FlameOutputBytes {
    return {
        id: entry.id,
        contract: Uint8Array.from(Buffer.from(entry.bytes, 'base64')),
        note: entry.note === undefined ? null : Uint8Array.from(Buffer.from(entry.note, 'base64'))
    };
}

const isForeignToken = (output: FlameOutput): boolean =>
    output.amount.status === 'notToken' ||
    (output.amount.status === 'counted' && output.amount.flavor !== FLAME_NATIVE_FLAVOR);

const countedQty = (output: FlameOutput): bigint | null =>
    output.amount.status === 'counted' ? output.amount.qty : null;

export class FlameOutputs {
    constructor(public readonly outputs: FlameOutput[]) {}

    public static fromScan(
        entries: FlameApiScanEntry[],
        amounts: Map<string, FlameOutputAmount>
    ): FlameOutputs {
        return new FlameOutputs(
            entries.map(entry => ({
                id: entry.id,
                bytes: toFlameOutputBytes(entry),
                height: entry.height,
                txid: entry.txid,
                spent: entry.spent ?? null,
                amount: amounts.get(entry.id) ?? { status: 'unreadable' }
            }))
        );
    }

    public get unspent(): FlameOutput[] {
        return this.outputs.filter(output => output.spent === null && !isForeignToken(output));
    }

    public get spendable(): FlameOutput[] {
        return this.unspent.filter(output => countedQty(output) !== null);
    }

    public get balance(): FlameAssetAmount {
        const total = this.unspent.reduce((acc, output) => acc + (countedQty(output) ?? 0n), 0n);
        return FlameAssetAmount.fromWeiAmount(total);
    }

    public get hasUnreadableUnspent(): boolean {
        return this.unspent.some(output => output.amount.status !== 'counted');
    }

    public get history(): FlameActivityItem[] {
        const byTxid = new Map<
            string,
            {
                height: number;
                received: bigint;
                spent: bigint;
                spendsOwnOutput: boolean;
                hasUnreadable: boolean;
                memo: string | null;
            }
        >();
        const entry = (txid: string, height: number) => {
            let item = byTxid.get(txid);
            if (!item) {
                item = {
                    height,
                    received: 0n,
                    spent: 0n,
                    spendsOwnOutput: false,
                    hasUnreadable: false,
                    memo: null
                };
                byTxid.set(txid, item);
            }
            return item;
        };

        for (const output of this.outputs) {
            if (isForeignToken(output)) continue;
            const qty = countedQty(output);

            const receipt = entry(output.txid, output.height);
            receipt.received += qty ?? 0n;
            receipt.hasUnreadable ||= qty === null;
            receipt.memo ??= (output.amount.status === 'counted' && output.amount.memo) || null;

            if (output.spent) {
                const spend = entry(output.spent.txid, output.spent.height);
                spend.spent += qty ?? 0n;
                spend.spendsOwnOutput = true;
                spend.hasUnreadable ||= qty === null;
            }
        }

        return [...byTxid.entries()]
            .map(([txid, item]) => {
                const isInitiator = item.spendsOwnOutput;
                const value = isInitiator ? item.spent - item.received : item.received;
                return {
                    txid,
                    height: item.height,
                    isInitiator,
                    value: FlameAssetAmount.fromWeiAmount(value < 0n ? 0n : value),
                    hasUnreadableOutputs: item.hasUnreadable,
                    memo: item.memo
                };
            })
            .sort((a, b) => b.height - a.height);
    }
}
