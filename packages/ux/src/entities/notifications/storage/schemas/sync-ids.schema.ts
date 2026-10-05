import z from 'zod';

export const sPushSyncIds = z.union([z.null(), z.record(z.string(), z.string())]);
