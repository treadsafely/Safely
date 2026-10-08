/**
 * Stable selectors for e2e (Maestro) tests.
 *
 * Keep values in sync with the flows under `apps/mobile/.maestro`.
 * Prefer testID over text matchers in flows — the app is localized (en/ru),
 * so matching by visible text is locale-fragile.
 */
export const TEST_ID = {
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
        receiveButton: 'home.receiveButton'
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
        continueButton: 'importWallet.continueButton'
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
        switchAmountMode: 'send.switchAmountMode'
    },
    confirmation: {
        fee: 'confirmation.fee',
        sliderKnob: 'confirmation.sliderKnob',
        backToWallet: 'confirmation.backToWallet'
    }
} as const;
