import { describe, expect, it } from 'vitest';

import type { ILedgerSessionPort, Portfolio } from '@safely/core';
import {
    PortfolioBip39,
    PortfolioFactory,
    PortfolioIdBip39Imported,
    PortfolioLedger,
    PortfolioNetworkType,
    PortfolioWatchOnlyBtc
} from '@safely/core';

import { resolveRemoveWalletCopy } from '../../../src/features/portfolio-flow/remove-wallet-copy';
import {
    ClosableMnemonicAccessorVault,
    MockSecretEncryptor
} from '../../entities/portfolio/portfolio-mocks';

const ledgerSessionPort: ILedgerSessionPort = {
    withSession: () => {
        throw new Error('Ledger session is not used in this test');
    }
};

const MAINNET_ADDRESS = 'bc1qcleg3jtmvlar6cgm24vpq6n8ew3d0hame0av83';
const MAINNET_MNEMONIC =
    'ivory trouble wheat next depart dove choice easily enroll suffer lawsuit lend'.split(' ');

const ICON = { type: 'emoji', value: '🦊' } as const;

async function makeBip39(options?: { revealedFromDevice: string }): Promise<Portfolio> {
    const encryptor = new MockSecretEncryptor();
    const accessor = new ClosableMnemonicAccessorVault(MAINNET_MNEMONIC);
    const id = await PortfolioIdBip39Imported.create(accessor, PortfolioNetworkType.MAINNET);
    const serialized = await PortfolioBip39.createSerializedPortfolio({
        id,
        encryptor,
        mnemonicAccessor: accessor,
        meta: { name: 'Bip39', icon: ICON },
        options: options && { seedRevealedFromDevice: options.revealedFromDevice }
    });

    return PortfolioFactory.restorePortfolio(serialized, { encryptor, ledgerSessionPort });
}

function makeWatchOnly(): Portfolio {
    return PortfolioWatchOnlyBtc.create(
        PortfolioWatchOnlyBtc.resolveUserInput(MAINNET_ADDRESS, PortfolioNetworkType.MAINNET),
        { name: 'Watch', icon: ICON }
    );
}

function makeLedger(): Portfolio {
    const serialized = PortfolioLedger.createSerializedPortfolio({
        masterFingerprint: Buffer.from('0f056943', 'hex'),
        networkType: PortfolioNetworkType.MAINNET,
        deviceModel: 'nanoX',
        accounts: [
            {
                index: 0,
                xpub: 'xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj',
                name: 'Ledger 1'
            }
        ],
        meta: { name: 'Ledger', icon: ICON }
    });

    return PortfolioFactory.restorePortfolio(serialized, {
        encryptor: new MockSecretEncryptor(),
        ledgerSessionPort
    });
}

describe('resolveRemoveWalletCopy', () => {
    it('asks a ledger wallet to be disconnected, with no back-up link', () => {
        const copy = resolveRemoveWalletCopy(makeLedger());

        expect(copy).toEqual({
            titleKey: 'removeWallet.disconnectLedger.title',
            subtitleKey: 'removeWallet.disconnectLedger.subtitle',
            checkboxKey: 'removeWallet.disconnectLedger.checkbox',
            buttonKey: 'removeWallet.disconnectLedger.button',
            hasBackUpLink: false
        });
    });

    it('drops the acknowledgement and the back-up link for a watch-only wallet', () => {
        const copy = resolveRemoveWalletCopy(makeWatchOnly());

        expect(copy).toEqual({
            titleKey: 'removeWallet.title',
            subtitleKey: 'removeWallet.watchOnly.subtitle',
            buttonKey: 'removeWallet.removeButton',
            hasBackUpLink: false
        });
    });

    it('warns a bip39 wallet whose phrase was never revealed', async () => {
        const copy = resolveRemoveWalletCopy(await makeBip39());

        expect(copy).toEqual({
            titleKey: 'removeWallet.title',
            subtitleKey: 'removeWallet.notRevealed.subtitle',
            checkboxKey: 'removeWallet.notRevealed.checkbox',
            buttonKey: 'removeWallet.removeButton',
            hasBackUpLink: true
        });
    });

    it('switches the copy once the phrase has been revealed', async () => {
        const copy = resolveRemoveWalletCopy(
            await makeBip39({ revealedFromDevice: 'MacBook Pro' })
        );

        expect(copy).toEqual({
            titleKey: 'removeWallet.title',
            subtitleKey: 'removeWallet.revealed.subtitle',
            checkboxKey: 'removeWallet.revealed.checkbox',
            buttonKey: 'removeWallet.removeButton',
            hasBackUpLink: true
        });
    });
});
