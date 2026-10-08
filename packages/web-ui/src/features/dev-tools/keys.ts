import { defineQueryKeys, finalKey } from '@safely/ux';

export const devToolsLogsKeys = defineQueryKeys('devToolsLogs', {
    records: finalKey
});
