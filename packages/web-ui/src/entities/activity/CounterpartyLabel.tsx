import type { FC } from 'react';

import type { ActivityCounterparty } from '@safely/ux';
import Human16 from '@safely/ux/assets/icons/16/human-16.svg?react';

import { contactIconStyles, counterpartyStyles, providerStyles } from './CounterpartyLabel.styles';
import { Icon, Text } from '../../shared';
import { toContactColorStyle } from '../contact';
import { WalletIcon } from '../portfolio';

export type CounterpartyLabelProps = {
    counterparty: ActivityCounterparty;
};

export const CounterpartyLabel: FC<CounterpartyLabelProps> = ({ counterparty }) => {
    switch (counterparty.kind) {
        case 'contact':
            return (
                <span className={counterpartyStyles}>
                    <Icon
                        asset={Human16}
                        tone="inherit"
                        size={12}
                        className={contactIconStyles}
                        style={toContactColorStyle(counterparty.meta.color)}
                    />
                    <Text variant="bodyM" tone="secondary" isTruncated>
                        {counterparty.meta.name}
                    </Text>
                </span>
            );
        case 'portfolio':
            return (
                <span className={counterpartyStyles}>
                    <WalletIcon icon={counterparty.meta.icon} />
                    <Text variant="bodyM" tone="secondary" isTruncated>
                        {counterparty.meta.name}
                    </Text>
                </span>
            );
        case 'address':
            return (
                <Text variant="bodyM" tone="secondary" isTruncated>
                    {counterparty.label}
                </Text>
            );
        case 'provider':
            return (
                <Text variant="bodyM" tone="secondary" isTruncated className={providerStyles}>
                    {counterparty.label}
                </Text>
            );
    }
};
