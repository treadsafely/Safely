import type { Clock } from './clock';
import { systemClock } from './clock';
import { assertValidTimestamp, isRecursiveSlot, type Slot, type SlotMap } from './slots';
import { cloneSlot } from './slots/slot-json';

export interface MergeStats {
    added: number;
    updated: number;
    kept: number;
    replaced: number;
}

export class MergeProtocol {
    public readonly id: string;
    private clock: number;

    constructor(
        authorId: string,
        private readonly wallClock: Clock = systemClock
    ) {
        this.id = authorId;
        this.clock = this.wallTime();
    }

    public wallTime(): number {
        return this.wallClock.nowSeconds();
    }

    public tick(): number {
        const wallClockTime = this.wallTime();
        const next = Math.max(this.clock, wallClockTime) + 1;
        if (!Number.isSafeInteger(next)) {
            throw new Error('Logical clock exhausted');
        }

        this.clock = next;
        return next;
    }

    public observe(timestamp: number): void {
        assertValidTimestamp(timestamp);

        if (timestamp > this.clock) {
            this.clock = timestamp;
        }
    }

    public observeTree(slot: Slot | undefined): void {
        if (slot === undefined) {
            return;
        }

        this.observe(slot.t);
        if (isRecursiveSlot(slot)) {
            for (const key of Object.keys(slot.v)) {
                this.observeTree(slot.v[key]);
            }
        }
    }

    public static compareClocks(left: Pick<Slot, 't' | 'a'>, right: Pick<Slot, 't' | 'a'>): number {
        if (left.t !== right.t) {
            return left.t - right.t;
        }

        if (left.a < right.a) {
            return -1;
        }

        if (left.a > right.a) {
            return 1;
        }

        return 0;
    }

    public merge(local: Slot, incoming: Slot): MergeStats {
        const stats: MergeStats = { added: 0, updated: 0, kept: 0, replaced: 0 };
        this.observeTree(incoming);
        this.mergeSlot(local, incoming, stats);
        return stats;
    }

    private mergeSlot(local: Slot, incoming: Slot, stats: MergeStats): void {
        if (
            isRecursiveSlot(local) &&
            isRecursiveSlot(incoming) &&
            local.s === incoming.s &&
            MergeProtocol.compareClocks(local, incoming) === 0
        ) {
            this.mergeContainerValues(local.v, incoming.v, stats);
            stats.kept += 1;
            return;
        }

        if (MergeProtocol.compareClocks(incoming, local) > 0) {
            this.replaceSlot(local, incoming);
            stats.replaced += 1;
            return;
        }

        stats.kept += 1;
    }

    private mergeContainerValues(
        localValues: SlotMap,
        incomingValues: SlotMap,
        stats: MergeStats
    ): void {
        for (const key of Object.keys(incomingValues)) {
            const incomingValue = incomingValues[key];

            if (incomingValue === undefined) {
                continue;
            }

            const localValue = localValues[key];

            if (localValue === undefined) {
                localValues[key] = cloneSlot(incomingValue);
                stats.added += 1;
                continue;
            }

            this.mergeSlot(localValue, incomingValue, stats);
        }
    }

    private replaceSlot(local: Slot, incoming: Slot): void {
        const localRecord = local as unknown as Record<string, unknown>;

        for (const key of Object.keys(localRecord)) {
            delete localRecord[key];
        }

        Object.assign(localRecord, cloneSlot(incoming));
    }
}
