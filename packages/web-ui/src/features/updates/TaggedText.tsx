import type { FC, ReactElement, ReactNode } from 'react';
import { Trans } from 'react-i18next';

import type { TaggedTextPost } from '@safely/core';
import { LinkingProtocol, useLinking } from '@safely/ux';

import { boldStyles, bulletStyles, linkStyles } from './UpdatesFeed.styles';
import { Text } from '../../shared';

export type TaggedTextProps = Pick<TaggedTextPost, 'links'> & {
    taggedText: string;
};

const Bullet: FC<{ children?: ReactNode }> = ({ children }) => (
    <span className={bulletStyles}>{children}</span>
);

export const TaggedText: FC<TaggedTextProps> = ({ taggedText, links }) => {
    const { openURL } = useLinking();

    const components: Record<string, ReactElement> = {
        b: <span className={boldStyles} />,
        br: <br />,
        li: <Bullet />
    };

    for (const [name, url] of Object.entries(links ?? {})) {
        components[name] = (
            <button
                type="button"
                className={linkStyles}
                onClick={() => openURL(url, { allowedProtocols: [LinkingProtocol.HTTPS] })}
            />
        );
    }

    return (
        <Text variant="bodyM">
            <Trans defaults={taggedText} components={components} />
        </Text>
    );
};
