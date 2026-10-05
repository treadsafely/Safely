import { useNavigation } from '@react-navigation/core';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAccounts, useActiveAccountMeta, useChangeAccountMeta } from '@safely/ux';

import { Button, Cell, List } from '@mobile/shared/ui';

import { styles } from './AccountSection.styles';
import { AccountSelector } from './AccountSelector';

export const AccountSection = () => {
    const { t } = useTranslation();
    const accounts = useAccounts();
    const activeAccountName = useActiveAccountMeta().name;
    const navigation = useNavigation();
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    const nativeStackNavigation = useNavigation<NativeStackNavigationProp<{}>>();
    const { mutateAsync: changeAccountMeta } = useChangeAccountMeta();

    const handleEditAccount = () => {
        navigation.navigate('CustomizeAccountModal', {
            defaultName: activeAccountName,
            onSave: async (name: string) => {
                await changeAccountMeta({ name });
                nativeStackNavigation.pop();
            },
            onClose: () => {
                nativeStackNavigation.pop();
            }
        });
    };

    const handleAddAccount = () => {
        navigation.navigate('AddAccountSheet');
    };

    return (
        <List>
            <List.Title>{t('settings.groups.account.title')}</List.Title>
            <AccountSelector
                accounts={accounts ?? []}
                onSelectAccountNavigate={() =>
                    navigation.navigate('SelectAccountSelectorModal', { hasAddAccount: true })
                }
                onAddAccount={handleAddAccount}
            />
            <List.Group variant="divided" style={styles.accountOptions}>
                <Cell onPress={handleEditAccount}>
                    <Cell.Content>
                        <Cell.Row>
                            <Cell.Title>
                                {t('settings.groups.account.options.editAccount')}
                            </Cell.Title>
                        </Cell.Row>
                    </Cell.Content>
                    <Cell.Chevron />
                </Cell>
                <Cell
                    onPress={() =>
                        navigation.navigate('SettingsModal', { screen: 'NotificationsModal' })
                    }
                >
                    <Cell.Content>
                        <Cell.Row>
                            <Cell.Title>
                                {t('settings.groups.account.options.notifications')}
                            </Cell.Title>
                        </Cell.Row>
                    </Cell.Content>
                    <Cell.Chevron />
                </Cell>
                <Cell
                    onPress={() =>
                        navigation.navigate('SettingsModal', { screen: 'AddressBookModal' })
                    }
                >
                    <Cell.Content>
                        <Cell.Row>
                            <Cell.Title>
                                {t('settings.groups.account.options.addressBook')}
                            </Cell.Title>
                        </Cell.Row>
                    </Cell.Content>
                    <Cell.Chevron />
                </Cell>
            </List.Group>
            <View style={styles.buttonsContainer}>
                <Button type="secondary" size="small" onPress={handleAddAccount}>
                    {t('settings.addAccount')}
                </Button>
            </View>
        </List>
    );
};
