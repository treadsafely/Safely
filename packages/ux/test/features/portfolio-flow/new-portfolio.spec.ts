import { describe, expect, it } from 'vitest';

import type { Portfolio } from '@safely/core';
import {
    PortfolioIdBip39Imported,
    PortfolioIdBip39MasterKeyDerived,
    PortfolioNetworkType,
    PortfolioWatchOnlyBtc
} from '@safely/core';

import {
    resolveGeneratedPortfolioIcon,
    resolveImportedPortfolio,
    resolveWatchOnlyPortfolio
} from '../../../src/features/portfolio-flow/new-portfolio';
import { ClosableMnemonicAccessorVault } from '../../entities/portfolio/portfolio-mocks';

const MAINNET_ADDRESS = 'bc1qcleg3jtmvlar6cgm24vpq6n8ew3d0hame0av83';
const ANOTHER_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
const MAINNET_MNEMONIC =
    'ivory trouble wheat next depart dove choice easily enroll suffer lawsuit lend'.split(' ');

const ICON = { type: 'emoji', value: '🦊' } as const;

function makeWatchOnly(address: string): Portfolio {
    return PortfolioWatchOnlyBtc.create(
        PortfolioWatchOnlyBtc.resolveUserInput(address, PortfolioNetworkType.MAINNET),
        { name: 'Watch', icon: ICON }
    );
}

describe('resolveGeneratedPortfolioIcon', () => {
    it('takes the emoji the account already reserved for the next wallet', () => {
        expect(resolveGeneratedPortfolioIcon({ emoji: '🐙', index: 3 })).toEqual({
            type: 'emoji',
            value: '🐙'
        });
    });

    it('falls back to the emoji of the upcoming derivation index', () => {
        expect(resolveGeneratedPortfolioIcon({ index: 3 })).toEqual(
            PortfolioIdBip39MasterKeyDerived.getFallbackEmoji(3)
        );
    });

    it('falls back to index zero when the account has no reservation yet', () => {
        expect(resolveGeneratedPortfolioIcon(null)).toEqual(
            PortfolioIdBip39MasterKeyDerived.getFallbackEmoji(0)
        );
        expect(resolveGeneratedPortfolioIcon(undefined)).toEqual(
            PortfolioIdBip39MasterKeyDerived.getFallbackEmoji(0)
        );
    });
});

describe('resolveWatchOnlyPortfolio', () => {
    it('reports the wallet that already watches the address', () => {
        const existing = makeWatchOnly(MAINNET_ADDRESS);

        expect(
            resolveWatchOnlyPortfolio(MAINNET_ADDRESS, PortfolioNetworkType.MAINNET, [existing])
        ).toEqual({ kind: 'duplicate', portfolio: existing });
    });

    it('returns the fallback icon of the resolved id for a new address', () => {
        const resolution = resolveWatchOnlyPortfolio(
            ANOTHER_ADDRESS,
            PortfolioNetworkType.MAINNET,
            [makeWatchOnly(MAINNET_ADDRESS)]
        );

        expect(resolution.kind).toBe('new');
        expect(resolution).toHaveProperty('icon.type', 'emoji');
    });
});

describe('resolveImportedPortfolio', () => {
    it('reports the wallet already imported from the same phrase', async () => {
        const accessor = new ClosableMnemonicAccessorVault(MAINNET_MNEMONIC);
        const id = await PortfolioIdBip39Imported.create(accessor, PortfolioNetworkType.MAINNET);
        const existing = { id } as Portfolio;

        await expect(
            resolveImportedPortfolio(accessor, PortfolioNetworkType.MAINNET, [existing])
        ).resolves.toEqual({ kind: 'duplicate', portfolio: existing });
    });

    it('returns the phrase-derived fallback icon when nothing matches', async () => {
        const accessor = new ClosableMnemonicAccessorVault(MAINNET_MNEMONIC);

        await expect(
            resolveImportedPortfolio(accessor, PortfolioNetworkType.MAINNET, [])
        ).resolves.toEqual({
            kind: 'new',
            icon: PortfolioIdBip39Imported.getFallbackEmoji(accessor)
        });
    });

    it('separates the same phrase on mainnet from testnet', async () => {
        const accessor = new ClosableMnemonicAccessorVault(MAINNET_MNEMONIC);
        const mainnetId = await PortfolioIdBip39Imported.create(
            accessor,
            PortfolioNetworkType.MAINNET
        );

        await expect(
            resolveImportedPortfolio(accessor, PortfolioNetworkType.TESTNET, [
                { id: mainnetId } as Portfolio
            ])
        ).resolves.toHaveProperty('kind', 'new');
    });
});
