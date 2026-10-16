import type { FC } from 'react';

import type { ContactMeta } from '@safely/core';

import { ContactIcon } from './ContactIcon';
import { Cell } from '../../shared';

export type ContactCellProps = {
    meta: ContactMeta;
    isSelected?: boolean;
    onSelect: () => void;
};

export const ContactCell: FC<ContactCellProps> = props => {
    const { meta, isSelected, onSelect } = props;

    return (
        <Cell onClick={onSelect}>
            <Cell.Leading>
                <ContactIcon color={meta.color} />
            </Cell.Leading>
            <Cell.Content>
                <Cell.Title>{meta.name}</Cell.Title>
            </Cell.Content>
            {isSelected && <Cell.Checkmark />}
        </Cell>
    );
};
