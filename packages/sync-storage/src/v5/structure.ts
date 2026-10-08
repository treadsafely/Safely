import { patch } from '@safely/slottree';

import { sNotifications } from './schemas';
import { syncedStorageV4 } from '../v4/structure';

const syncedStorageSchema = syncedStorageV4.schema.extend({
    notifications: sNotifications
});

export const syncedStorageV5 = {
    version: 5,
    schema: syncedStorageSchema,
    initial: {
        ...syncedStorageV4.initial,
        notifications: {}
    },
    projectUp: patch(syncedStorageV4.schema, syncedStorageSchema, draft =>
        draft.newField('notifications', {})
    ),
    projectDown: patch(syncedStorageSchema, syncedStorageV4.schema, draft =>
        draft.deleteField('notifications')
    )
} as const;
