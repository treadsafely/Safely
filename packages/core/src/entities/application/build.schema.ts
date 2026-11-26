import { z } from 'zod';

export const sBuild = z.enum(['ios', 'android', 'macos', 'windows']);
export type Build = z.infer<typeof sBuild>;
