import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AddressBookModal } from '@mobile/screens/AddressBookModal';
import { DevToolsConfigScreen } from '@mobile/screens/DevToolsConfigScreen';
import { DevToolsLogsScreen } from '@mobile/screens/DevToolsLogsScreen';
import { DevToolsScreen } from '@mobile/screens/DevToolsScreen';
import { DevToolsSyncStorageScreen } from '@mobile/screens/DevToolsSyncStorageScreen';
import { DevToolsXpubScreen } from '@mobile/screens/DevToolsXpubScreen';
import { LanguageScreen } from '@mobile/screens/LanguageScreen';
import { LegalScreen } from '@mobile/screens/LegalScreen';
import { NotificationsScreen } from '@mobile/screens/NotificationsScreen';
import { NotificationsTransactionsScreen } from '@mobile/screens/NotificationsTransactionsScreen';
import { NotificationsWalletsScreen } from '@mobile/screens/NotificationsWalletsScreen';
import { SecurityScreen } from '@mobile/screens/SecurityScreen';
import { SettingsScreen } from '@mobile/screens/SettingsScreen';
import { WalletSettingsScreen } from '@mobile/screens/WalletSettingsScreen';

export const SettingsStack = createNativeStackNavigator({
    initialRouteName: 'SettingsRootModal',
    groups: {
        Screens: {
            screens: {
                SettingsRootModal: SettingsScreen,
                WalletSettingsModal: WalletSettingsScreen,
                LanguageModal: LanguageScreen,
                LegalModal: LegalScreen,
                SecurityModal: SecurityScreen,
                NotificationsModal: NotificationsScreen,
                NotificationsTransactionsModal: NotificationsTransactionsScreen,
                NotificationsWalletsModal: NotificationsWalletsScreen,
                AddressBookModal: AddressBookModal,
                DevToolsModal: DevToolsScreen,
                DevToolsXpubModal: DevToolsXpubScreen,
                DevToolsLogsModal: DevToolsLogsScreen,
                DevToolsSyncStorageModal: DevToolsSyncStorageScreen,
                DevToolsConfigModal: DevToolsConfigScreen
            }
        }
    },
    screenOptions: {
        headerShown: false
    }
});
