import type { FC } from 'react';

import type { ContactMeta } from '@safely/core';
import Human16 from '@safely/ux/assets/icons/16/human-16.svg?react';

import { toContactColorStyle } from './contact-color';
import { iconStyles } from './ContactIcon.styles';
import { Icon } from '../../shared';

export type ContactIconProps = {
    color: ContactMeta['color'];
};

export const ContactIcon: FC<ContactIconProps> = props => (
    <Icon
        asset={Human16}
        tone="inherit"
        className={iconStyles}
        style={toContactColorStyle(props.color)}
    />
);
