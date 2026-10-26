import type { FC, ReactNode } from 'react';

import { cx } from '@safely/web-ui/styled-system/css';

import { actionStyles, descriptionStyles, rootStyles } from './EmptyState.styles';
import { Text } from '../Text';

export type EmptyStateProps = {
    title: string;
    description: string;
    media?: ReactNode;
    action?: ReactNode;
    className?: string;
};

export const EmptyState: FC<EmptyStateProps> = props => {
    const { title, description, media, action, className } = props;

    return (
        <div className={cx(rootStyles, className)}>
            {media}

            <Text variant="titleS">{title}</Text>
            <Text variant="bodyM" tone="secondary" align="center" className={descriptionStyles}>
                {description}
            </Text>

            {action !== undefined && <div className={actionStyles}>{action}</div>}
        </div>
    );
};
