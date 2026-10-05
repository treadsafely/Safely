import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AddAccountSheet } from '@mobile/screens/AddAccountSheet';
import { BiometryScreen } from '@mobile/screens/BiometryScreen';
import { ChangePasscodeScreen } from '@mobile/screens/ChangePasscodeScreen';
import { ConfirmXpubImportSheet } from '@mobile/screens/ConfirmXpubImportSheet';
import { ConnectToSignSheet } from '@mobile/screens/ConnectToSignSheet';
import { CustomizeAccountModal } from '@mobile/screens/CustomizeAccountModal';
import { CustomizeWalletModal } from '@mobile/screens/CustomizeWalletModal';
import { DestructiveConfirmSheet } from '@mobile/screens/DestructiveConfirmSheet';
import { DeviceLinkedModal } from '@mobile/screens/DeviceLinkedModal';
import { DeviceSupportWizardModal } from '@mobile/screens/DeviceSupportWizardModal';
import { DeviceUnarchivedSheet } from '@mobile/screens/DeviceUnarchivedSheet';
import { ExchangeModal } from '@mobile/screens/ExchangeModal';
import { LinkDeviceWarningModal } from '@mobile/screens/LinkDeviceWarningModal';
import { MoreOptionsSheet } from '@mobile/screens/MoreOptionsSheet';
import { NewContactModal } from '@mobile/screens/NewContactModal';
import { ConfirmDeleteContactSheet } from '@mobile/screens/NewContactModal/screens/ConfirmDeleteContactSheet';
import { OnboardingImportWalletScreen } from '@mobile/screens/OnboardingImportWalletScreen';
import { OnboardingNotificationsScreen } from '@mobile/screens/OnboardingNotificationsScreen';
import { OnboardingPasscodeScreen } from '@mobile/screens/OnboardingPasscodeScreen';
import { OnboardingWatchAccountScreen } from '@mobile/screens/OnboardingWatchAccountScreen';
import { OrderScreen } from '@mobile/screens/OrderScreen';
import { PasscodeVerificationScreen } from '@mobile/screens/PasscodeVerificationScreen';
import { PendingFundsSheet } from '@mobile/screens/PendingFundsSheet';
import { ProviderSheet } from '@mobile/screens/ProviderSheet';
import { QRScanModal } from '@mobile/screens/QRScanModal';
import { ReceiveAssetModal } from '@mobile/screens/ReceiveAssetModal';
import { RemoveWalletSheet } from '@mobile/screens/RemoveWalletSheet';
import { DeviceDetailsScreen } from '@mobile/screens/SafetyScreen/screens';
import { RecoveryConfirmSheet, RecoveryPhraseSheet } from '@mobile/screens/SecurityScreen/screens';
import { SelectAccountModal } from '@mobile/screens/SelectAccountModal';
import { SelectAccountSelectorModal } from '@mobile/screens/SelectAccountSelectorModal';
import { SignInScreen } from '@mobile/screens/SignInScreen';
import { SignInSuccessScreen } from '@mobile/screens/SignInSuccessScreen';
import { SignOutAccountSheet } from '@mobile/screens/SignOutAccountSheet';
import { TransactionScreen } from '@mobile/screens/TransactionScreen';
import { WatchOnlySheet } from '@mobile/screens/WatchOnlySheet';
import { WelcomeScreen } from '@mobile/screens/WelcomeScreen';

import { AddWalletStack } from './stacks/AddWalletStack';
import { CurrencyStack } from './stacks/CurrencyStack';
import { OnboardingLedgerStack } from './stacks/OnboardingLedgerStack';
import { RestrictedStack } from './stacks/RestrictedStack';
import { SendStack } from './stacks/SendStack';
import { SettingsStack } from './stacks/SettingsStack';
import { SignInStack } from './stacks/SignInStack';
import { TabsNavigator } from './tabs';

export const RootStack = createNativeStackNavigator({
    groups: {
        Onboarding: {
            screens: {
                WelcomeScreen: WelcomeScreen,
                OnboardingPasscodeScreen: OnboardingPasscodeScreen,
                BiometryScreen: BiometryScreen,
                OnboardingNotificationsScreen: OnboardingNotificationsScreen,
                SignInScreen: SignInScreen,
                SignInSuccessScreen: SignInSuccessScreen,
                OnboardingImportWalletScreen: OnboardingImportWalletScreen,
                OnboardingWatchAccountScreen: {
                    screen: OnboardingWatchAccountScreen,
                    options: {
                        presentation: 'card'
                    }
                },
                OnboardingConnectLedgerModal: {
                    screen: OnboardingLedgerStack,
                    options: {
                        presentation: 'card'
                    }
                }
            }
        },
        Screens: {
            screens: {
                TabsNavigator: {
                    screen: TabsNavigator,
                    linking: {
                        path: 'tab'
                    }
                },
                RestrictedFlow: RestrictedStack,
                TransactionScreen: TransactionScreen,
                OrderScreen: OrderScreen,
                DeviceDetailsScreen: DeviceDetailsScreen,
                PasscodeVerificationScreen: {
                    screen: PasscodeVerificationScreen,
                    options: {
                        presentation: 'fullScreenModal',
                        animation: 'fade',
                        animationDuration: 50
                    }
                },
                ChangePasscodeScreen: {
                    screen: ChangePasscodeScreen,
                    options: {
                        presentation: 'fullScreenModal',
                        animation: 'fade',
                        animationDuration: 50
                    }
                }
            }
        },
        Modals: {
            screens: {
                SettingsModal: SettingsStack,
                CurrencyModal: CurrencyStack,
                ExchangeModal: ExchangeModal,
                RecoveryPhraseModal: RecoveryPhraseSheet,
                SignInModal: SignInStack,
                CustomizeAccountModal: CustomizeAccountModal,
                CustomizeWalletModal: CustomizeWalletModal,
                QRScanModal: QRScanModal,
                LinkDeviceWarningModal: LinkDeviceWarningModal,
                DeviceLinkedModal: DeviceLinkedModal,
                DeviceSupportWizardModal: DeviceSupportWizardModal,
                NewContactModal: NewContactModal,
                AddWalletModal: AddWalletStack,
                SelectAccountModal: SelectAccountModal,
                SelectAccountSelectorModal: SelectAccountSelectorModal,
                ReceiveAssetModal: ReceiveAssetModal,
                SendAssetModal: SendStack
            },
            screenOptions: {
                presentation: 'modal'
            }
        },
        Sheets: {
            screens: {
                AddAccountSheet: AddAccountSheet,
                DeviceUnarchivedSheet: DeviceUnarchivedSheet,
                RecoveryConfirmSheet: RecoveryConfirmSheet,
                DestructiveConfirmSheet: DestructiveConfirmSheet,
                RemoveWalletSheet: RemoveWalletSheet,
                SignOutAccountSheet: SignOutAccountSheet,
                WatchOnlySheet: WatchOnlySheet,
                PendingFundsSheet: PendingFundsSheet,
                MoreOptionsSheet: MoreOptionsSheet,
                ConfirmDeleteContactSheet: ConfirmDeleteContactSheet,
                ConnectToSignSheet: ConnectToSignSheet,
                ConfirmXpubImportSheet: ConfirmXpubImportSheet,
                ProviderSheet: ProviderSheet
            },
            screenOptions: {
                animationDuration: 0,
                presentation: 'transparentModal',
                animation: 'none',
                contentStyle: {
                    backgroundColor: 'transparent'
                }
            }
        }
    },
    screenOptions: {
        headerShown: false
    }
});

const Navigation = createStaticNavigation(RootStack);

export default Navigation;
