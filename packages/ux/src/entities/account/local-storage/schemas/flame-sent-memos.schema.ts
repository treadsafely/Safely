import z from 'zod';

export const sFlameSentMemosSchema = z
    .record(z.string(), z.string())
    .nullable()
    .transform(memos => memos ?? {});

export type SFlameSentMemosSchema = z.output<typeof sFlameSentMemosSchema>;
