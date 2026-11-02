import { patch } from '@safely/slottree';

import { sChart } from './schemas';
import { syncedStorageV7 } from '../v7/structure';

const syncedStorageSchema = syncedStorageV7.schema.extend({
    chart: sChart
});

export const syncedStorageV8 = {
    version: 8,
    schema: syncedStorageSchema,
    initial: {
        ...syncedStorageV7.initial,
        chart: {}
    },
    projectUp: patch(syncedStorageV7.schema, syncedStorageSchema, draft =>
        draft.newField('chart', {})
    ),
    projectDown: patch(syncedStorageSchema, syncedStorageV7.schema, draft =>
        draft.deleteField('chart')
    )
} as const;
