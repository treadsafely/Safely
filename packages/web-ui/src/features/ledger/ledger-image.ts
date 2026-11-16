import type { LedgerImageKey } from '@safely/ux';
import { getLedgerImageKey } from '@safely/ux';
import btcAppLogo from '@safely/ux/assets/images/ledger/btc-app-logo-96.png';
import ledgerFlex from '@safely/ux/assets/images/ledger/ledger-flex-cover.png';
import ledgerNanoGen5 from '@safely/ux/assets/images/ledger/ledger-nano-gen-5-cover.png';
import ledgerPreview from '@safely/ux/assets/images/ledger/ledger-preview.png';
import ledgerStax from '@safely/ux/assets/images/ledger/ledger-stax-cover.png';
import ledgerNanoX from '@safely/ux/assets/images/ledger/ledger-x-nano.png';

const LEDGER_IMAGE: Record<LedgerImageKey, string> = {
    stax: ledgerStax,
    flex: ledgerFlex,
    nanoX: ledgerNanoX,
    nanoGen5: ledgerNanoGen5,
    preview: ledgerPreview
};

export const getLedgerImage = (model?: string): string => LEDGER_IMAGE[getLedgerImageKey(model)];

export const LEDGER_BTC_APP_LOGO = btcAppLogo;
