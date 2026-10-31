import type { FC, ReactNode } from 'react';

import { subtitleRowStyles, titleRowStyles } from './LedgerDerivationRow.styles';
import { Badge, Cell, Skeleton } from '../../shared';

export type LedgerDerivationRowProps = {
    index: number;
    title?: string;
    subtitle?: ReactNode;
    badge?: ReactNode;
    accessory?: ReactNode;
    isSubtitleLoading?: boolean;
    isSkeleton?: boolean;
    isInteractive?: boolean;
    onClick?: () => void;
};

export const LedgerDerivationRow: FC<LedgerDerivationRowProps> = props => {
    const {
        index,
        title,
        subtitle,
        badge,
        accessory,
        isSubtitleLoading = false,
        isSkeleton = false,
        isInteractive,
        onClick
    } = props;

    return (
        <Cell isInteractive={isInteractive} onClick={isSkeleton ? undefined : onClick}>
            <Cell.Leading>
                <Badge>{index + 1}</Badge>
            </Cell.Leading>
            <Cell.Content>
                <Cell.Row className={titleRowStyles}>
                    {isSkeleton ? (
                        <Skeleton width={120} height={16} />
                    ) : (
                        <>
                            <Cell.Title>{title}</Cell.Title>
                            {badge}
                        </>
                    )}
                </Cell.Row>
                <Cell.Row className={subtitleRowStyles}>
                    {isSkeleton || isSubtitleLoading ? (
                        <Skeleton width={140} height={14} />
                    ) : (
                        <Cell.Subtitle>{subtitle}</Cell.Subtitle>
                    )}
                </Cell.Row>
            </Cell.Content>
            {accessory !== undefined && <Cell.Trailing>{accessory}</Cell.Trailing>}
        </Cell>
    );
};
