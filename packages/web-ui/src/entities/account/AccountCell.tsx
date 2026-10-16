import type { FC } from 'react';

import { useAccountMeta, useAccountStoreSlot, useTranslate } from '@safely/ux';

import { Cell } from '../../shared';

export type AccountCellProps = {
    accountId: string;
    isActive: boolean;
    onSelect: () => void;
};

export const AccountCell: FC<AccountCellProps> = props => {
    const { accountId, isActive, onSelect } = props;

    const t = useTranslate();
    const { name } = useAccountMeta(accountId);
    const walletsCount = useAccountStoreSlot(accountId, 'portfolios')?.length ?? 0;

    return (
        <Cell onClick={onSelect}>
            <Cell.Content>
                <Cell.Title>{name}</Cell.Title>
                <Cell.Subtitle>{t('settings.walletsCount', { count: walletsCount })}</Cell.Subtitle>
            </Cell.Content>
            {isActive && <Cell.Checkmark />}
        </Cell>
    );
};
