import type { FC } from 'react';

import { useAccounts, useActiveAccount, useSetActiveAccount, useTranslate } from '@safely/ux';

import { addAccountStyles, listStyles } from './SettingsSection.styles';
import { AccountCell } from '../../../entities';
import type { useAccountFlow } from '../../../features';
import { Button, List, PageHeader } from '../../../shared';

export type AccountSettingsProps = {
    flow: ReturnType<typeof useAccountFlow>;
};

export const AccountSettings: FC<AccountSettingsProps> = ({ flow }) => {
    const t = useTranslate();
    const accounts = useAccounts();
    const { accountId: activeAccountId } = useActiveAccount();
    const { mutate: setActiveAccount } = useSetActiveAccount();

    return (
        <>
            <PageHeader title={t('account.title')} hasDivider />

            <List className={listStyles}>
                <List.Group variant="separated">
                    {accounts.map(account => (
                        <AccountCell
                            key={account.accountId}
                            accountId={account.accountId}
                            isActive={account.accountId === activeAccountId}
                            onSelect={() =>
                                account.accountId !== activeAccountId &&
                                setActiveAccount(account.accountId)
                            }
                        />
                    ))}
                </List.Group>

                <Button
                    variant="secondary"
                    isFullWidth
                    className={addAccountStyles}
                    onClick={flow.openAdd}
                >
                    {t('settings.addAccount')}
                </Button>
            </List>
        </>
    );
};
