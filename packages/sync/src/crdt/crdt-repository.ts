import type { z } from 'zod';

import type { AssertVersionHList, Clock, HCons, NewOf, StorageVersion } from '@safely/slottree';
import { createStorage, createStorageFromSnapshot } from '@safely/slottree';

import { CRDT } from './crdt';
import type { IStorage } from '../I-storage';

export class CrdtRepository<Latest extends StorageVersion, Rest> {
    constructor(
        private readonly storage: IStorage,
        private readonly ikPub: Buffer,
        private readonly versions: HCons<Latest, Rest> & AssertVersionHList<HCons<Latest, Rest>>,
        private readonly storageKey = 'crdt',
        private readonly clock?: Clock
    ) {}

    public async loadCRDT(): Promise<CRDT<z.output<NewOf<Latest>>>> {
        let crdtRaw = await this.storage.getItem(this.storageKey);
        if (!crdtRaw) {
            await this.initialize();
            crdtRaw = await this.storage.getItem(this.storageKey);
            if (!crdtRaw) {
                throw new Error('Crdt not found in storage');
            }
        }
        const crdt = this.createCRDTFromSnapshot(Buffer.from(crdtRaw, 'base64url'));
        const snapshot = crdt.encodeAsSnapshot();
        if (snapshot.toString('base64url') !== crdtRaw) {
            await this.saveSnapshot(snapshot);
        }
        return crdt;
    }

    public createCRDTFromSnapshot(snapshot: Buffer): CRDT<z.output<NewOf<Latest>>> {
        const crdt = createStorageFromSnapshot({
            authorId: this.ikPub,
            versions: this.versions,
            snapshot,
            clock: this.clock
        });
        return new CRDT(crdt);
    }

    public async saveCRDT(crdt: CRDT<z.output<NewOf<Latest>>>): Promise<void> {
        await this.saveSnapshot(crdt.encodeAsSnapshot());
    }

    public async saveSnapshot(snapshot: Buffer): Promise<void> {
        await this.storage.setItem(this.storageKey, snapshot.toString('base64url'));
    }

    public async initialize(): Promise<void> {
        const crdt = createStorage({
            authorId: this.ikPub,
            versions: this.versions,
            clock: this.clock
        });

        await this.storage.setItem(this.storageKey, crdt.export().toString('base64url'));
    }
}
