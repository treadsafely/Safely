import './global-polyfills';

import '@mobile/shared/i18n';
import '@mobile/shared/unistyles';

import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';

import { App } from '@mobile/app';
import { ExpoPushNotifications } from '@mobile/shared/push-notifications';

SplashScreen.preventAutoHideAsync();
ExpoPushNotifications.configureForegroundPresentation();

registerRootComponent(App);
