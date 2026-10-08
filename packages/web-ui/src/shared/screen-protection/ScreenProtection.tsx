import type { FC, ReactNode } from 'react';
import { use, useEffect } from 'react';

import { ScreenProtectionContext } from './ScreenProtectionProvider';

export type ScreenProtectionProps = {
    children: ReactNode;
};

export const ScreenProtection: FC<ScreenProtectionProps> = props => {
    const protection = use(ScreenProtectionContext);

    useEffect(() => protection?.acquire(), [protection]);

    return props.children;
};
