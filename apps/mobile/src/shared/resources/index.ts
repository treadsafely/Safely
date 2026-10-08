import BtcAppLogo from './images/ledger/btc-app-logo-96.png';
import LedgerFlex from './images/ledger/ledger-flex-cover.png';
import LedgerNanoGen5 from './images/ledger/ledger-nano-gen-5-cover.png';
import LedgerPreview from './images/ledger/ledger-preview.png';
import LedgerStax from './images/ledger/ledger-stax-cover.png';
import LedgerXNano from './images/ledger/ledger-x-nano.png';
import Noise from './images/noise.png';
import SafelyLogoWithBg from './images/safely-logo-with-bg.png';
import SafelyLogo from './images/safely-logo.svg';
import SlidersBoxed from './images/sliders-boxed.png';
import SyncStepNoPaper from './images/sync-step-no-paper.png';
import SyncStepProtect from './images/sync-step-protect.png';
import SyncStepUseSync from './images/sync-step-use-sync.png';
import WelcomeScreenBg from './images/welcome-screen-bg.jpg';

export { DottedShieldIcon } from './vectors/DottedShieldIcon';

export const resources = {
    safelyLogo: SafelyLogo,
    safelyLogoWithBg: SafelyLogoWithBg,
    slidersBoxed: SlidersBoxed,
    syncStepNoPaper: SyncStepNoPaper,
    syncStepProtect: SyncStepProtect,
    syncStepUseSync: SyncStepUseSync,
    ledgerPreview: LedgerPreview,
    btcAppLogo: BtcAppLogo,
    ledgerCovers: {
        xNanoGen5: LedgerNanoGen5,
        stax: LedgerStax,
        flex: LedgerFlex,
        xNano: LedgerXNano
    },
    welcomeScreenBg: WelcomeScreenBg,
    noise: Noise
} as const;
