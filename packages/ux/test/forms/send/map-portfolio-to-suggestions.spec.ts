import { describe, expect, it } from 'vitest';

import type { IDerivation, Portfolio } from '@safely/core';
import { BLOCKCHAIN_NAME, PortfolioType } from '@safely/core';

import { mapPortfolioToSuggestions } from '../../../src/features/forms/send/utils';

const id = (value: string) => ({
    toString: () => value,
    isEq: (o: { toString(): string }) => o.toString() === value
});

const derivation = (index: number) =>
    ({
        id: id(`d${index}`),
        index,
        chains: { btc: { wallets: [{ address: `bc1-${index}` }] } }
    }) as unknown as IDerivation;

const bip39 = {
    type: PortfolioType.BIP39,
    id: id('p'),
    meta: { name: 'Main', icon: { type: 'emoji', value: '🙂' } },
    getDerivations: () => [derivation(0)]
} as unknown as Portfolio;

const watchOnly = {
    type: PortfolioType.WATCH_ONLY,
    id: id('w'),
    meta: { name: 'Watch', icon: { type: 'emoji', value: '👀' } },
    wallet: { address: 'bc1-watch' }
} as unknown as Portfolio;

const devnet = {
    type: PortfolioType.FLAME_DEVNET,
    id: id('dev'),
    meta: { name: 'Devnet', icon: { type: 'emoji', value: '🔥' } },
    flame: { wallets: [{ receivingAddress: 't1-dev' }] }
} as unknown as Portfolio;

const name = (n: number) => `Wallet ${n}`;

describe('mapPortfolioToSuggestions', () => {
    it('suggests BTC addresses and no devnet wallet by default', () => {
        expect(mapPortfolioToSuggestions(bip39, undefined, name).map(s => s.address)).toEqual([
            'bc1-0'
        ]);
        expect(mapPortfolioToSuggestions(devnet, undefined, name)).toEqual([]);
    });

    it('suggests only devnet wallets for Flame', () => {
        expect(mapPortfolioToSuggestions(devnet, undefined, name, BLOCKCHAIN_NAME.FLAME)).toEqual([
            { id: 'dev', address: 't1-dev', meta: devnet.meta }
        ]);
        expect(mapPortfolioToSuggestions(bip39, undefined, name, BLOCKCHAIN_NAME.FLAME)).toEqual(
            []
        );
        expect(
            mapPortfolioToSuggestions(watchOnly, undefined, name, BLOCKCHAIN_NAME.FLAME)
        ).toEqual([]);
    });

    it('does not suggest the active devnet wallet to itself', () => {
        expect(
            mapPortfolioToSuggestions(
                devnet,
                { portfolioId: devnet.id },
                name,
                BLOCKCHAIN_NAME.FLAME
            )
        ).toEqual([]);
    });
});
