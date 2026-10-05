import z from 'zod';

export const sPushGroupIds = z.union([z.null(), z.record(z.string(), z.string())]);
