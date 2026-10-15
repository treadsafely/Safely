import { describe, expect, it } from 'vitest';

import type { IDerivation, Portfolio } from '@safely/core';
import { BLOCKCHAIN_NAME, PortfolioType } from '@safely/core';

import { mapPortfolioToSuggestions } from '../../../src/features/forms/send/utils';

const id = (value: string) => ({ toString: () => value, isEq: (o: { toString(): string }) => o.toString() === value });

const derivation = (index: number, flameAddress?: string) =>
    ({
        id: id(`d${index}`),
        index,
        chains: {
            btc: { wallets: [{ address: `bc1-${index}` }] },
            ...(flameAddress && { flame: { wallet: { address: flameAddress } } })
        }
    }) as unknown as IDerivation;

const bip39 = (derivations: IDerivation[]) =>
    ({
        type: PortfolioType.BIP39,
        id: id('p'),
        meta: { name: 'Main', icon: { type: 'emoji', value: '🙂' } },
        getDerivations: () => derivations
    }) as unknown as Portfolio;

const name = (n: number) => `Wallet ${n}`;

describe('mapPortfolioToSuggestions', () => {
    it('suggests BTC addresses by default', () => {
        const suggestions = mapPortfolioToSuggestions(bip39([derivation(0, 'tf1a')]), undefined, name);

        expect(suggestions.map(s => s.address)).toEqual(['bc1-0']);
    });

    it('suggests Flame addresses and skips derivations without Flame', () => {
        const suggestions = mapPortfolioToSuggestions(
            bip39([derivation(0, 'tf1a'), derivation(1)]),
            undefined,
            name,
            BLOCKCHAIN_NAME.FLAME
        );

        expect(suggestions.map(s => s.address)).toEqual(['tf1a']);
    });

    it('suggests no watch-only wallet for Flame', () => {
        const watchOnly = {
            type: PortfolioType.WATCH_ONLY,
            id: id('w'),
            meta: { name: 'Watch', icon: { type: 'emoji', value: '👀' } },
            wallet: { address: 'bc1-watch' }
        } as unknown as Portfolio;

        expect(mapPortfolioToSuggestions(watchOnly, undefined, name, BLOCKCHAIN_NAME.FLAME)).toEqual(
            []
        );
    });
});
