import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
    applyClockOps,
    clockOpsArb,
    initialClockTimesArb,
    makeClockWorld,
    syncWorldFromFrozenSnapshots
} from './ops';

describe('Divergent clock CRDT properties', () => {
    it('converges after random clock changes, writes, merges and restarts', () => {
        fc.assert(
            fc.property(initialClockTimesArb, clockOpsArb, (initialTimes, ops) => {
                const world = makeClockWorld(initialTimes);
                applyClockOps(world, ops);

                syncWorldFromFrozenSnapshots(world);

                expect(world[1].storage.export()).toEqual(world[2].storage.export());
                expect(world[2].storage.export()).toEqual(world[3].storage.export());
            }),
            {
                numRuns: 10000
            }
        );
    });
});
