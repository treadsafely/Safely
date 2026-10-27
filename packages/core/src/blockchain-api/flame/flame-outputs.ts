import type { FlameApiHistoryContract, FlameApiUnspentEntry } from '../../api/flame/models';
import { FlameAssetAmount } from '../../entities/asset/exact-crypto-assets-amounts';
import type {
    FlameOutputAmount,
    FlameOutputBytes
} from '../../entities/derivation/flame/I-flame-wallet';

export interface FlameOutput {
    id: string;
    bytes: FlameOutputBytes;
    amount: FlameOutputAmount;
}

export function toFlameOutputBytes(
    contract: Pick<FlameApiUnspentEntry | FlameApiHistoryContract, 'id' | 'bytes' | 'note'>
): FlameOutputBytes {
    return {
        id: contract.id,
        contract: Uint8Array.from(Buffer.from(contract.bytes, 'base64')),
        note:
            contract.note === undefined
                ? null
                : Uint8Array.from(Buffer.from(contract.note, 'base64'))
    };
}

export const isForeignFlameToken = (amount: FlameOutputAmount): boolean =>
    amount.status === 'notToken' || (amount.status === 'counted' && !amount.isNative);

export const countedFlameQty = (amount: FlameOutputAmount): bigint | null =>
    amount.status === 'counted' ? amount.qty : null;

export class FlameOutputs {
    constructor(public readonly outputs: FlameOutput[]) {}

    public static fromUnspent(
        entries: FlameApiUnspentEntry[],
        amounts: Map<string, FlameOutputAmount>
    ): FlameOutputs {
        return new FlameOutputs(
            entries.map(entry => ({
                id: entry.id,
                bytes: toFlameOutputBytes(entry),
                amount: amounts.get(entry.id) ?? { status: 'unreadable' }
            }))
        );
    }

    public get unspent(): FlameOutput[] {
        return this.outputs.filter(output => !isForeignFlameToken(output.amount));
    }

    public get spendable(): FlameOutput[] {
        return this.unspent.filter(output => countedFlameQty(output.amount) !== null);
    }

    public get balance(): FlameAssetAmount {
        return FlameAssetAmount.fromWeiAmount(
            this.spendable.reduce((acc, output) => acc + (countedFlameQty(output.amount) ?? 0n), 0n)
        );
    }

    public get hasUnreadableUnspent(): boolean {
        return this.unspent.some(output => output.amount.status !== 'counted');
    }
}
