import fc from 'fast-check';
import type { z } from 'zod';

import type { Clock, SlotTree } from '../../../src';
import { createStorage, createStorageFromSnapshot } from '../../../src';
import type { schemaV1 } from '../../unit/versioning/version-fixtures';
import { v1 } from '../../unit/versioning/version-fixtures';

type ClockState = z.output<typeof schemaV1>;

export type DeviceIndex = 1 | 2 | 3;

type Replica = {
    authorId: Buffer;
    clock: MutableClock;
    storage: SlotTree<ClockState>;
};

export type ClockWorld = {
    1: Replica;
    2: Replica;
    3: Replica;
};

export type ClockOp =
    | { type: 'clock.set'; device: DeviceIndex; seconds: number }
    | { type: 'storage.setNumber'; device: DeviceIndex; value: number }
    | { type: 'storage.setString'; device: DeviceIndex; value: string }
    | { type: 'storage.merge'; from: DeviceIndex; to: DeviceIndex }
    | { type: 'storage.restart'; device: DeviceIndex };

export type InitialClockTimes = readonly [number, number, number];

const deviceIndices = [1, 2, 3] as const;
const clockTimeArb = fc.integer({ min: 0, max: 2_200_000_000 });
const deviceArb = fc.constantFrom(...deviceIndices);
const safeString = fc.string({ maxLength: 20 });

const setClockArb: fc.Arbitrary<ClockOp> = fc
    .record({
        device: deviceArb,
        seconds: clockTimeArb
    })
    .map(({ device, seconds }) => ({
        type: 'clock.set' as const,
        device,
        seconds
    }));

const setNumberArb: fc.Arbitrary<ClockOp> = fc
    .record({
        device: deviceArb,
        value: fc.integer()
    })
    .map(({ device, value }) => ({
        type: 'storage.setNumber' as const,
        device,
        value
    }));

const setStringArb: fc.Arbitrary<ClockOp> = fc
    .record({
        device: deviceArb,
        value: safeString
    })
    .map(({ device, value }) => ({
        type: 'storage.setString' as const,
        device,
        value
    }));

const mergeArb: fc.Arbitrary<ClockOp> = fc
    .constantFrom(
        { from: 1, to: 2 } as const,
        { from: 1, to: 3 } as const,
        { from: 2, to: 1 } as const,
        { from: 2, to: 3 } as const,
        { from: 3, to: 1 } as const,
        { from: 3, to: 2 } as const
    )
    .map(({ from, to }) => ({
        type: 'storage.merge' as const,
        from,
        to
    }));

const restartArb: fc.Arbitrary<ClockOp> = deviceArb.map(device => ({
    type: 'storage.restart' as const,
    device
}));

export const initialClockTimesArb: fc.Arbitrary<InitialClockTimes> = fc
    .tuple(clockTimeArb, clockTimeArb, clockTimeArb)
    .filter(([first, second, third]) => first !== second || second !== third);

export const clockOpArb: fc.Arbitrary<ClockOp> = fc.oneof(
    setNumberArb,
    setNumberArb,
    setStringArb,
    setStringArb,
    mergeArb,
    mergeArb,
    setClockArb,
    restartArb
);

export const clockOpsArb = fc.array(clockOpArb, { maxLength: 50 });

export class MutableClock implements Clock {
    constructor(private seconds: number) {}

    public nowSeconds(): number {
        return this.seconds;
    }

    public set(seconds: number): void {
        this.seconds = seconds;
    }
}

export function makeClockWorld(initialTimes: InitialClockTimes): ClockWorld {
    return {
        1: makeReplica(1, initialTimes[0]),
        2: makeReplica(2, initialTimes[1]),
        3: makeReplica(3, initialTimes[2])
    };
}

export function syncWorldFromFrozenSnapshots(world: ClockWorld): void {
    const snapshots = {
        1: world[1].storage.export(),
        2: world[2].storage.export(),
        3: world[3].storage.export()
    };
    const deliveryOrders: Record<DeviceIndex, readonly DeviceIndex[]> = {
        1: [1, 2, 3],
        2: [2, 3, 1],
        3: [3, 1, 2]
    };

    for (const target of deviceIndices) {
        for (const source of deliveryOrders[target]) {
            world[target].storage.merge(snapshots[source]);
        }
    }
}

function makeReplica(device: DeviceIndex, seconds: number): Replica {
    const authorId = Buffer.from(`clock-device-${device}`);
    const clock = new MutableClock(seconds);
    const storage = createStorage({
        authorId,
        versions: v1,
        clock
    });

    return { authorId, clock, storage };
}

export function applyClockOps(world: ClockWorld, ops: readonly ClockOp[]): void {
    for (const op of ops) {
        applyClockOp(world, op);
    }
}

function applyClockOp(world: ClockWorld, op: ClockOp): void {
    switch (op.type) {
        case 'clock.set':
            world[op.device].clock.set(op.seconds);
            return;

        case 'storage.setNumber':
            world[op.device].storage.transaction(draft => {
                draft.set('key1', op.value);
            });
            return;

        case 'storage.setString':
            world[op.device].storage.transaction(draft => {
                draft.set('key2', op.value);
            });
            return;

        case 'storage.merge':
            world[op.to].storage.merge(world[op.from].storage.export());
            return;

        case 'storage.restart': {
            const replica = world[op.device];
            replica.storage = createStorageFromSnapshot({
                authorId: replica.authorId,
                versions: v1,
                snapshot: replica.storage.export(),
                clock: replica.clock
            });
            return;
        }
    }
}
