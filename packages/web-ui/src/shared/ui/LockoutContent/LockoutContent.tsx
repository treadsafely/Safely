import type { FC } from 'react';

import { lockoutRemainingCopy, useTranslate } from '@safely/ux';
import Lock56 from '@safely/ux/assets/icons/56/lock-56.svg?react';

import { lockoutStyles } from './LockoutContent.styles';
import { Icon } from '../Icon';
import { Text } from '../Text';

export type LockoutContentProps = {
    remainingSeconds: number;
};

export const LockoutContent: FC<LockoutContentProps> = props => {
    const { remainingSeconds } = props;

    const t = useTranslate();

    const remaining = lockoutRemainingCopy(remainingSeconds);
    const subtitle = t(remaining.translationKey, { count: remaining.count });

    return (
        <div className={lockoutStyles}>
            <Icon asset={Lock56} size={32} tone="tertiary" />
            <Text variant="titleS">{t('passcode.lockout.title')}</Text>
            <Text variant="bodyM" tone="secondary">
                {subtitle}
            </Text>
        </div>
    );
};
