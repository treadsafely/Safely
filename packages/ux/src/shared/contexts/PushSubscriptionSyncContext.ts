import { createContext, useContext } from 'react';

import type { SyncEventType } from '@safely/core';

export interface IPushSubscriptionSyncer {
    reset(): Promise<void>;
    announceSyncEvent(accountId: string, type: SyncEventType): Promise<void>;
}

const PushSubscriptionSyncContext = createContext<IPushSubscriptionSyncer | null>(null);

export const PushSubscriptionSyncContextProvider = PushSubscriptionSyncContext.Provider;

export const usePushSubscriptionSyncer = () => useContext(PushSubscriptionSyncContext);
