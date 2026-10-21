import type { FC, ReactNode } from 'react';

import { AccountSettings } from './AccountSettings';
import { AddressBookSettings } from './AddressBookSettings';
import { CurrencySettings } from './CurrencySettings';
import { DevToolsSettings } from './DevToolsSettings';
import { LanguageSettings } from './LanguageSettings';
import { LegalSettings } from './LegalSettings';
import type { DevTool, SettingsSection } from './types';
import { WalletSettings } from './WalletSettings';
import type { useAccountFlow } from '../../../features';

export type SettingsContentProps = {
    section: SettingsSection;
    tool: DevTool | null;
    account: ReturnType<typeof useAccountFlow>;
    security: ReactNode;
    logs: ReactNode;
    onSelectTool: (tool: DevTool | null) => void;
};

export const SettingsContent: FC<SettingsContentProps> = props => {
    const { section, tool, account, security, logs, onSelectTool } = props;

    switch (section) {
        case 'wallet':
            return <WalletSettings />;
        case 'addressBook':
            return <AddressBookSettings />;
        case 'account':
            return <AccountSettings flow={account} />;
        case 'security':
            return security;
        case 'language':
            return <LanguageSettings />;
        case 'currency':
            return <CurrencySettings />;
        case 'legal':
            return <LegalSettings />;
        case 'devTools':
            return <DevToolsSettings tool={tool} logs={logs} onSelectTool={onSelectTool} />;
    }
};
