import type { CSSProperties } from 'react';

export const toContactColorStyle = (color: string): CSSProperties =>
    ({ '--contact-color': color }) as CSSProperties;
