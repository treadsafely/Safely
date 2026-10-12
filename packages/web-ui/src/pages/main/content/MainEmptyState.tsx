import type { FC } from 'react';

import { useTranslate } from '@safely/ux';
import AddWallet96 from '@safely/ux/assets/icons/96/add-wallet-96.svg?react';

import { containerStyles, mediaStyles } from './MainEmptyState.styles';
import { Button, EmptyState, Icon } from '../../../shared';

export type MainEmptyStateProps = {
    onAddWallet: () => void;
};

export const MainEmptyState: FC<MainEmptyStateProps> = ({ onAddWallet }) => {
    const t = useTranslate();

    return (
        <EmptyState
            className={containerStyles}
            media={<Icon asset={AddWallet96} size={96} className={mediaStyles} />}
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
