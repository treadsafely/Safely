import type { FC, ReactNode } from 'react';

import {
    actionsStyles,
    bodyStyles,
    contentStyles,
    headerStyles,
    rootStyles,
    textStyles
} from './NoticeScreen.styles';
import type { IconAsset } from '../Icon';
import { Icon } from '../Icon';
import { Text } from '../Text';

export type NoticeScreenProps = {
    icon: IconAsset;
    title: string;
    description: string;
    actions: ReactNode;
    children?: ReactNode;
};

export const NoticeScreen: FC<NoticeScreenProps> = props => {
    const { icon, title, description, actions, children } = props;

    return (
        <div className={rootStyles}>
            <div className={headerStyles} />

            <div className={bodyStyles}>
                <div className={contentStyles}>
                    <Icon asset={icon} tone="tertiary" />

                    <div className={textStyles}>
                        <Text variant="titleM" align="center">
                            {title}
                        </Text>
                        <Text variant="bodyL" tone="secondary" align="center">
                            {description}
                        </Text>
                    </div>
                </div>

                <div className={actionsStyles}>{actions}</div>
            </div>

            {children}
        </div>
    );
};
