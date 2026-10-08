import type { Clock } from '@safely/slottree';

import { InMemStorage } from './storage';
import { createSyncServerApiImplementations } from './sync-server-api-implementations';
import { getSyncServer } from './sync-server-registry';
import { SyncAccountFactory } from '../../../src';
import { Logger } from '../../../src/logger/logger';
import { Versions } from '../../fixtures/account';

let factoryCounter = 0;

export function makeFactory(crdtClock?: Clock) {
    const storage = new InMemStorage();
    const encryptedStorage = new InMemStorage();
    const factoryId = factoryCounter++;

    return {
        factory: new SyncAccountFactory({
            storage,
            encryptedStorage,
            versions: Versions,
            apiConfiguration: {
                basePath: 'sync-server://mock'
            },
            apiImplementationsFactory: requesterIk =>
                createSyncServerApiImplementations(getSyncServer(), requesterIk),
            pollingTimeout: 1,
            crdtClock,
            logger: new Logger().child(`property:${factoryId}`)
        })
    };
}

export type MockSyncAccountFactory = ReturnType<typeof makeFactory>;
