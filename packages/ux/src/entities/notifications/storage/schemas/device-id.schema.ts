import z from 'zod';

export const sPushDeviceId = z.union([z.null(), z.string()]);
