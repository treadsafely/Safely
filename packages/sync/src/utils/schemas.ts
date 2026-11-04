import { z } from 'zod';

export const BufferHexSchema = z
    .hex({ error: 'Invalid hex string for Buffer' })
    .refine(hex => hex.length % 2 === 0, { error: 'Invalid hex string for Buffer' })
    .transform(hex => Buffer.from(hex, 'hex'));
