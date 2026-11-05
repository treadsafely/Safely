import type { FC } from 'react';

import { useLinking } from '@safely/ux';

import { attributionStyles } from './Chart.styles';
import { Text } from '../../shared';

export type ProviderLabelProps = {
    label: string;
    link?: string;
};

export const ProviderLabel: FC<ProviderLabelProps> = ({ label, link }) => {
    const { openURL } = useLinking();

    if (link === undefined) {
        return (
            <Text variant="bodyS" tone="tertiary">
                {label}
            </Text>
        );
    }

    return (
        <button type="button" className={attributionStyles} onClick={() => openURL(link)}>
            {label}
        </button>
    );
};
