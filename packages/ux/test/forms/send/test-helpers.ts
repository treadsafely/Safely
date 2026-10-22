import { vi } from 'vitest';
import { createActor } from 'xstate';

import {
    BLOCKCHAIN_NAME,
    BTC_ASSET,
    BtcAssetAmount,
    type Contact,
    FiatAsset,
    FiatAssetId,
    NumberFormatter,
    PortfolioNetworkType,
    type RatedCryptoAssetAmount,
    Rate,
    toBig,
    WebNumberFormatLocale
} from '@safely/core';
import { Logger } from '@safely/sync';

import { createSendFormMachine } from '../../../src/features/forms/send/machine/machine';
import type { SendFormMachineInput } from '../../../src/features/forms/send/machine/types';
import type {
    ContactSuggestion,
    PortfolioSuggestion
} from '../../../src/features/forms/send/types';

export const VALID_ADDRESS = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
export const SELF_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
export const SUGGESTION_ADDRESS = 'bc1qcleg3jtmvlar6cgm24vpq6n8ew3d0hame0av83';
export const OTHER_VALID_ADDRESS = 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3';
export const INVALID_ADDRESS = 'not-an-address-x';
export const TOO_SHORT = 'bc';

export const BTC_ASSET_ID = BTC_ASSET.id.toString();

const USD = new FiatAsset(new FiatAssetId('USD'), 'US Dollar');

export function makeMockAsset(): RatedCryptoAssetAmount {
    return {
        amount: BtcAssetAmount.fromRelativeAmount('1.0'),
        price: new Rate(BTC_ASSET, USD, toBig('50000'))
    };
}

export function makeMockFormatter(): NumberFormatter {
    return new NumberFormatter(new WebNumberFormatLocale('en-US'), new Logger());
}

export function makeMaxSendValue(): BtcAssetAmount {
    return BtcAssetAmount.fromRelativeAmount('0.5');
}

export function makeZeroMaxSendValue(): BtcAssetAmount {
    return BtcAssetAmount.fromWeiAmount(0n);
}

export function makePortfolioSuggestion(opts: {
    id: string;
    address: string;
    name?: string;
}): PortfolioSuggestion {
    return {
        id: opts.id,
        address: opts.address,
        meta: { name: opts.name ?? opts.id, icon: { type: 'emoji', value: '🙂' } }
    };
}

export function makeContactSuggestion(opts: {
    id: string;
    address: string;
    name?: string;
}): ContactSuggestion {
    return {
        id: opts.id,
        address: opts.address,
        meta: { name: opts.name ?? opts.id, color: '#1E90FF' }
    };
}

export function makeSuggestions(items: { id: string; address: string }[]): {
    portfolios: PortfolioSuggestion[];
    contacts: ContactSuggestion[];
} {
    return {
        portfolios: items.map(i => makePortfolioSuggestion(i)),
        contacts: []
    };
}

export function startActor(input = makeMockInput()) {
    const actor = createActor(createSendFormMachine(), { input });
    actor.start();

    return actor;
}

export function setupAtAmountIdle(input = makeMockInput()) {
    const actor = startActor(input);
    actor.send({ type: 'SET_RECIPIENT', value: VALID_ADDRESS });
    actor.send({ type: 'NEXT' });

    return actor;
}

export async function setupAtAmountWithMax(maxValue: BtcAssetAmount, opts: MockInputOptions = {}) {
    const actor = startActor(makeMockInput({ ...opts, fetchMaxValue: async () => maxValue }));
    actor.send({ type: 'SET_RECIPIENT', value: VALID_ADDRESS });
    actor.send({ type: 'NEXT' });
    await vi.waitFor(() => {
        if (actor.getSnapshot().context.parsed.maxValue === undefined) {
            throw new Error('maxValue not yet set');
        }
    });

    return actor;
}

export function makeMockContact(
    opts: { id?: string; address?: string; name?: string; color?: string } = {}
): Contact {
    return {
        id: { toString: () => opts.id ?? 'new-contact-id' },
        addresses: [{ blockchain: 'BTC', address: opts.address ?? VALID_ADDRESS }],
        meta: { name: opts.name ?? 'Test Contact', color: opts.color ?? 'red' }
    } as unknown as Contact;
}

export interface MockInputOptions extends Partial<Omit<SendFormMachineInput, 'shouldResetForm'>> {
    activeWalletAddress?: string;
    portfolioSuggestions?: PortfolioSuggestion[];
    contactSuggestions?: ContactSuggestion[];
    shouldResetForm?: boolean;
}

export function makeMockInput(opts: MockInputOptions = {}): SendFormMachineInput {
    const formatter = opts.formatter ?? makeMockFormatter();
    const activeWallet = opts.activeWallet ?? {
        id: 'active-wallet',
        meta: { name: 'My Wallet', icon: { type: 'emoji', value: '🙂' } }
    };
    const ownAddresses = opts.ownAddresses ?? {
        [BLOCKCHAIN_NAME.BTC]: opts.activeWalletAddress ?? SELF_ADDRESS
    };
    const portfolioSuggestions = opts.portfolioSuggestions ?? [];
    const contactSuggestions = opts.contactSuggestions ?? [];
    const ratedAssets = opts.ratedAssets ?? [makeMockAsset()];
    const onSubmit = opts.onSubmit ?? (() => {});
    const createContact = opts.createContact ?? (async () => makeMockContact());
    const shouldResetFormValue = opts.shouldResetForm ?? true;

    return {
        resolvedInitialValues: opts.resolvedInitialValues,
        formatter,
        portfolioSuggestions,
        contactSuggestions,
        ratedAssets,
        activeWallet,
        ownAddresses,
        networkType: opts.networkType ?? PortfolioNetworkType.MAINNET,
        shouldResetForm: () => shouldResetFormValue,
        onSubmit,
        createContact,
        fetchMaxValue: opts.fetchMaxValue ?? (async () => undefined),
        persistAmountInputType: opts.persistAmountInputType ?? (() => {}),
        initialAmountInputType: opts.initialAmountInputType ?? 'crypto'
    };
}
