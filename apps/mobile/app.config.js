const { version } = require('./package.json');

module.exports = {
    expo: {
        name: 'Safely',
        slug: 'safely',
        version,
        orientation: 'portrait',
        icon: './assets/icon.png',
        userInterfaceStyle: 'dark',
        scheme: 'safely',
        ios: {
            infoPlist: {
                UIDesignRequiresCompatibility: true,
                NSFaceIDUsageDescription:
                    'We use Face ID to unlock your wallet securely.',
                NSCameraUsageDescription:
                    '$(PRODUCT_NAME) uses the camera to scan QR codes with recipient addresses and codes for linking your devices',
                CFBundleLocalizations: ['en', 'ru'],
                ITSAppUsesNonExemptEncryption: false
            },
            supportsTablet: true,
            /*
                https://developer.apple.com/documentation/BundleResources/Information-Property-List/UIRequiresFullScreen
                TODO: SAF-408
                we should prepare interface for resizing
                We force fullScreen because of known (slider) and unknown issues at this moment
                It's better to double-check app on ARM Macs and iPads before public release
            */
            requireFullScreen: true,
            bundleIdentifier: 'com.safely.wallet',
            appleTeamId: '3ZVCUSJU6R'
        },
        android: {
            permissions: ["android.permission.CAMERA"],
            /**
             * READ_MEDIA_IMAGES is needed as fallback in expo-screen-capture for older android versions
             * on method (addScreenshotListener) that we don't use
             */
            blockedPermissions: ["android.permission.READ_MEDIA_IMAGES"],
            adaptiveIcon: {
                foregroundImage: './assets/adaptive-icon.png',
                backgroundImage: './assets/android-icon-bg.png'
            },
            package: 'com.safely.wallet',
            googleServicesFile: './google-services.json',
            allowBackup: false
        },
        plugins: [
            'expo-image',
            'expo-sharing',
            [
                'expo-localization',
                {
                    supportedLocales: {
                        ios: ['en', 'ru'],
                        android: ['en', 'ru']
                    }
                }
            ],
            'react-native-bottom-tabs',
            'expo-asset',
            [
                'expo-splash-screen',
                {
                    image: './assets/splash-icon.png',
                    backgroundColor: "#0C0C0D"
                }
            ],
            [
                'expo-notifications',
                {
                    icon: './assets/notification-icon.png',
                    color: '#0178FF'
                }
            ],
            [
                'react-native-ble-plx',
                {
                    bluetoothAlwaysPermission:
                        '$(PRODUCT_NAME) needs access to Bluetooth to connect to your Ledger hardware wallet.'
                }
            ],
            './plugins/withMMKVNoBackup',
            './plugins/withPushContentExtension'
        ],
        extra: {
            eas: {
                projectId: 'ba0507d3-f22e-49b9-8925-aa436d193658',
                build: {
                    experimental: {
                        ios: {
                            appExtensions: [
                                {
                                    targetName: 'SafelyNotificationService',
                                    bundleIdentifier: 'com.safely.wallet.NotificationService',
                                    entitlements: {
                                        'com.apple.security.application-groups': [
                                            'group.com.safely.wallet'
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        },
        owner: 'treadsafely'
    }
};
