import type { CSSProperties } from 'react';

export const toWalletColorStyle = (color: string): CSSProperties =>
    ({ '--wallet-color': color }) as CSSProperties;
