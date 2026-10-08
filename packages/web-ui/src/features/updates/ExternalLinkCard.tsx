import type { FC } from 'react';

import type { ExternalLinkPost } from '@safely/core';
import { LinkingProtocol, useLinking } from '@safely/ux';

import {
    externalLinkBodyStyles,
    externalLinkImageStyles,
    externalLinkStyles
} from './UpdatesFeed.styles';
import { Text } from '../../shared';

export type ExternalLinkCardProps = Omit<ExternalLinkPost, 'type' | 'id' | 'timestamp'>;

export const ExternalLinkCard: FC<ExternalLinkCardProps> = props => {
    const { title, description, url, img_url } = props;

    const { openURL } = useLinking();

    return (
        <button
            type="button"
            className={externalLinkStyles}
            onClick={() => openURL(url, { allowedProtocols: [LinkingProtocol.HTTPS] })}
        >
            <span className={externalLinkBodyStyles}>
                <Text variant="labelM">{title}</Text>
                <Text variant="bodyM" tone="secondary">
                    {description}
                </Text>
            </span>

            {img_url !== undefined && (
                <img src={img_url} alt="" className={externalLinkImageStyles} />
            )}
        </button>
    );
};
