/**
 * Stable selectors for e2e (Maestro) tests.
 *
 * Keep values in sync with the flows under `apps/mobile/.maestro`.
 * Prefer testID over text matchers in flows — the app is localized (en/ru),
 * so matching by visible text is locale-fragile.
 */
export const TEST_ID = {
    onboarding: {
        notificationsLater: 'onboarding.notificationsLater'
    },
    welcome: {
        createWallet: 'welcome.createWallet',
        importWallet: 'welcome.importWallet',
        moreOptions: 'welcome.moreOptions',
        qrSignIn: 'welcome.qrSignIn',
        watchAccount: 'welcome.watchAccount'
    },
    biometry: {
        skip: 'biometry.skip'
    },
    home: {
        settingsButton: 'home.settingsButton',
        walletSelector: 'home.walletSelector',
        sendButton: 'home.sendButton',
        receiveButton: 'home.receiveButton',
        asset: {
            btc: 'home.asset.btc',
            flame: 'home.asset.flame'
        }
    },
    history: {
        item: 'history.item',
        pendingItem: 'history.pendingItem'
    },
    settings: {
        currentWallet: 'settings.currentWallet',
        security: 'settings.security'
    },
    security: {
        lockScreenSwitch: 'security.lockScreenSwitch'
    },
    lockScreen: {
        screen: 'lockScreen.screen'
    },
    walletSettings: {
        recoveryPhrase: 'walletSettings.recoveryPhrase'
    },
    recovery: {
        revealButton: 'recovery.revealButton',
        /** 1-based, matches the number shown next to the word */
        word: (index: number) => `recovery.word.${index}`
    },
    walletAlreadyAdded: {
        screen: 'walletAlreadyAdded.screen',
        openButton: 'walletAlreadyAdded.openButton'
    },
    receive: {
        address: 'receive.address'
    },
    accounts: {
        addWallet: 'accounts.addWallet'
    },
    addWallet: {
        createNew: 'addWallet.createNew',
        importExisting: 'addWallet.importExisting',
        watchAccount: 'addWallet.watchAccount',
        testnet: 'addWallet.testnet'
    },
    watchOnly: {
        addressInput: 'watchOnly.addressInput',
        continueButton: 'watchOnly.continueButton',
        confirmXpubAddress: 'watchOnly.confirmXpubAddress',
        confirmXpubButton: 'watchOnly.confirmXpubButton',
        cancelXpubButton: 'watchOnly.cancelXpubButton'
    },
    importWallet: {
        continueButton: 'importWallet.continueButton',
        error: 'importWallet.error'
    },
    customizeWallet: {
        saveButton: 'customizeWallet.saveButton'
    },
    passcodeVerification: {
        screen: 'passcodeVerification.screen'
    },
    send: {
        addressInput: 'send.addressInput',
        nextButton: 'send.nextButton',
        amountInput: 'send.amountInput',
        switchAmountMode: 'send.switchAmountMode',
        memoInput: 'send.memoInput'
    },
    confirmation: {
        fee: 'confirmation.fee',
        sliderKnob: 'confirmation.sliderKnob',
        backToWallet: 'confirmation.backToWallet'
    }
} as const;
