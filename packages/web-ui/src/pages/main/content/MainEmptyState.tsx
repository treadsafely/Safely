import type { FC } from 'react';

import { useTranslate } from '@safely/ux';
import Plus28 from '@safely/ux/assets/icons/28/plus-28.svg?react';

import { badgeStyles, containerStyles } from './MainEmptyState.styles';
import { Button, EmptyState, Icon } from '../../../shared';

export type MainEmptyStateProps = {
    onAddWallet: () => void;
};

export const MainEmptyState: FC<MainEmptyStateProps> = ({ onAddWallet }) => {
    const t = useTranslate();

    return (
        <EmptyState
            className={containerStyles}
            media={
                <div className={badgeStyles}>
                    <Icon asset={Plus28} size={24} tone="inherit" />
                </div>
            }
            title={t('home.emptyState.title')}
            description={t('home.emptyState.subtitle')}
            action={
                <Button variant="primary" size="small" onClick={onAddWallet}>
                    {t('addWallet.title')}
                </Button>
            }
        />
    );
};
