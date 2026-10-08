import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import type { Clock, StorageImpl } from '../src';
import { createStorage, createStorageFromSnapshot } from '../src';
import type { schemaV1 } from './unit/versioning/version-fixtures';
import { v1 } from './unit/versioning/version-fixtures';

type TestStorage = StorageImpl<z.output<typeof schemaV1>>;

const FAST_TIME = 2_000_000_000;
const SLOW_TIME = 1_000_000_000;

class FixedClock implements Clock {
    constructor(private readonly seconds: number) {}

    public nowSeconds(): number {
        return this.seconds;
    }
}

function createTestStorage(authorId: string, clock: Clock, snapshot?: Buffer): TestStorage {
    if (snapshot !== undefined) {
        return createStorageFromSnapshot({
            authorId: Buffer.from(authorId),
            versions: v1,
            snapshot,
            clock
        }) as TestStorage;
    }

    return createStorage({
        authorId: Buffer.from(authorId),
        versions: v1,
        clock
    }) as TestStorage;
}

describe('storage clocks', () => {
    it('creates a newer local revision after observing a future revision with a slow clock', () => {
        const fast = createTestStorage('fast-device', new FixedClock(FAST_TIME));
        const slow = createTestStorage('slow-device', new FixedClock(SLOW_TIME));

        fast.transaction(draft => {
            draft.set('key1', 1);
        });
        slow.merge(fast.export());

        const observedRevision = slow.getTopLevelRevision('key1');
        expect(observedRevision).toBeDefined();

        slow.transaction(draft => {
            draft.set('key1', 2);
        });

        const localRevision = slow.getTopLevelRevision('key1');
        expect(localRevision).toBeDefined();
        expect(localRevision?.compare(observedRevision!)).toBeGreaterThan(0);

        fast.merge(slow.export());
        expect(fast.get().key1).toBe(2);
        expect(fast.get()).toEqual(slow.get());
    });

    it('keeps concurrently updated replicas converged while their wall clocks remain divergent', () => {
        const fastClock = new FixedClock(FAST_TIME);
        const slowClock = new FixedClock(SLOW_TIME);
        const fast = createTestStorage('fast-device', fastClock);
        const slow = createTestStorage('slow-device', slowClock);

        for (let round = 0; round < 5; round += 1) {
            fast.transaction(draft => {
                draft.set('key1', round * 2 + 1);
            });
            slow.transaction(draft => {
                draft.set('key1', round * 2 + 2);
            });

            const fastSnapshot = fast.export();
            const slowSnapshot = slow.export();

            fast.merge(slowSnapshot);
            slow.merge(fastSnapshot);

            expect(fast.get()).toEqual(slow.get());
            expect(
                fast.getTopLevelRevision('key1')!.compare(slow.getTopLevelRevision('key1')!)
            ).toBe(0);
        }
    });
});
