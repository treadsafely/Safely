import type { FC } from 'react';

import { ellipsisMiddle } from '@safely/core';
import { useTranslate } from '@safely/ux';

import {
    fixedStyles,
    shrinkableHalfStyles,
    shrinkableStyles,
    subtitleStyles
} from './SendModal.styles';
import { Text } from '../../shared';

export type SendHeaderSubtitleProps = {
    fromName: string;
    recipient?: string;
    recipientAlias?: string;
};

export const SendHeaderSubtitle: FC<SendHeaderSubtitleProps> = props => {
    const { fromName, recipient, recipientAlias } = props;

    const t = useTranslate();

    return (
        <span className={subtitleStyles}>
            {recipient === undefined ? (
                <>
                    <Text variant="bodyM" tone="secondary" className={fixedStyles}>
                        {t('send.from')}
                    </Text>
                    <Text variant="bodyM" tone="secondary" isTruncated className={shrinkableStyles}>
                        {fromName}
                    </Text>
                </>
            ) : (
                <>
                    <Text
                        variant="bodyM"
                        tone="secondary"
                        isTruncated
                        className={shrinkableHalfStyles}
                    >
                        {fromName}
                    </Text>
                    <Text variant="bodyM" tone="tertiary" className={fixedStyles}>
                        →
                    </Text>
                    {recipientAlias !== undefined && (
                        <Text
                            variant="bodyM"
                            tone="secondary"
                            isTruncated
                            className={shrinkableHalfStyles}
                        >
                            {recipientAlias}
                        </Text>
                    )}
                    <Text variant="bodyM" tone="tertiary" className={fixedStyles}>
                        {ellipsisMiddle(recipient)}
                    </Text>
                </>
            )}
        </span>
    );
};
