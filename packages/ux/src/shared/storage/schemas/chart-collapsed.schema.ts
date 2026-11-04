import z from 'zod';

export const sChartCollapsed = z.union([z.null(), z.boolean()]);
