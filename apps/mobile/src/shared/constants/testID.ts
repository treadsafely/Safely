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
            btc: 'home.asset.btc'
        }
    },
    history: {
        pendingItem: 'history.pendingItem'
    },
    settings: {
        currentWallet: 'settings.currentWallet',
        signOutAccount: 'settings.signOutAccount',
        closeButton: 'settings.closeButton'
    },
    signOutAccount: {
        checkbox: 'signOutAccount.checkbox',
        confirmButton: 'signOutAccount.confirmButton'
    },
    onboardingPasscode: {
        screen: 'onboardingPasscode.screen'
    },
    walletSettings: {
        recoveryPhrase: 'walletSettings.recoveryPhrase',
        backButton: 'walletSettings.backButton'
    },
    watchOnlySheet: {
        screen: 'watchOnlySheet.screen',
        okButton: 'watchOnlySheet.okButton'
    },
    recovery: {
        revealButton: 'recovery.revealButton',
        closeButton: 'recovery.closeButton',
        word: (shownNumber: number) => `recovery.word.${shownNumber}`
    },
    receive: {
        address: 'receive.address',
        closeButton: 'receive.closeButton'
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
        backButton: 'importWallet.backButton',
        continueButton: 'importWallet.continueButton',
        error: 'importWallet.error'
    },
    customizeWallet: {
        nameInput: 'customizeWallet.nameInput',
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
