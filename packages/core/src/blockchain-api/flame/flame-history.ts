import { countedFlameQty, isForeignFlameToken } from './flame-outputs';
import type {
    FlameApiCounterparty,
    FlameApiHistoryContract,
    FlameApiHistoryEntry
} from '../../api/flame/models';
import { FlameAssetAmount } from '../../entities/asset/exact-crypto-assets-amounts';
import type { FlameOutputAmount } from '../../entities/derivation/flame/I-flame-wallet';

export type FlameHistoryItem = {
    txid: string;
    height: number | null;
    timestamp: number | null;
    isPending: boolean;
    isInitiator: boolean;
    value: FlameAssetAmount;
    fee: FlameAssetAmount | null;
    hasUnreadableOutputs: boolean;
    memo: string | null;
    counterpartyAddress: string | null;
};

export function flameHistoryContracts(entries: FlameApiHistoryEntry[]): FlameApiHistoryContract[] {
    return entries.flatMap(entry => [...entry.created, ...entry.spent]);
}

function counterpartiesOf(
    entry: FlameApiHistoryEntry,
    isInitiator: boolean
): FlameApiCounterparty[] {
    if (!isInitiator) return entry.others_spent;

    // beside someone else's coins, what a transaction creates for others is that payer's change
    return entry.others_spent.length === 0 ? entry.others_created : [];
}

export function toFlameHistoryItem(
    entry: FlameApiHistoryEntry,
    amounts: Map<string, FlameOutputAmount>
): FlameHistoryItem | null {
    const native = (contracts: FlameApiHistoryContract[]) =>
        contracts
            .map(contract => amounts.get(contract.id) ?? { status: 'unreadable' as const })
            .filter(amount => !isForeignFlameToken(amount));

    const created = native(entry.created);
    const spent = native(entry.spent);
    if (created.length === 0 && spent.length === 0) {
        return null;
    }

    const sum = (list: FlameOutputAmount[]) =>
        list.reduce((acc, amount) => acc + (countedFlameQty(amount) ?? 0n), 0n);

    const isInitiator = spent.length > 0;
    const fee = BigInt(entry.fee_sparks);
    const sent = sum(spent) - sum(created) - fee;
    const value = isInitiator ? sent : sum(created);
    const seconds = entry.time ?? entry.received_at;

    return {
        txid: entry.txid,
        height: entry.height ?? null,
        timestamp: seconds === undefined ? null : seconds * 1000,
        isPending: entry.height === undefined,
        isInitiator,
        value: FlameAssetAmount.fromWeiAmount(value < 0n ? 0n : value),
        fee: isInitiator ? FlameAssetAmount.fromWeiAmount(fee) : null,
        hasUnreadableOutputs: [...created, ...spent].some(amount => amount.status !== 'counted'),
        memo:
            created
                .map(amount => (amount.status === 'counted' && amount.memo) || null)
                .find(memo => memo !== null) ?? null,
        counterpartyAddress:
            counterpartiesOf(entry, isInitiator).find(other => other.address !== undefined)
                ?.address ?? null
    };
}
