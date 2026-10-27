import type { Contact, ContactMeta, Portfolio, PortfolioMeta } from '@safely/core';
import { ellipsisMiddle } from '@safely/core';

import { findContactMetaByAddress, findPortfolioMetaByAddress } from '../../entities';

export type ActivityCounterparty =
    | { kind: 'contact'; meta: ContactMeta }
    | { kind: 'portfolio'; meta: PortfolioMeta }
    | { kind: 'address'; label: string }
    | { kind: 'provider'; label: string };

export type KnownCounterparties = {
    contacts: Contact[];
    portfolios: Portfolio[];
};

const ADDRESS_ELLIPSIS_CHARS = 6;

export function resolveActivityCounterparty(
    address: string,
    known: KnownCounterparties
): ActivityCounterparty {
    const contactMeta = findContactMetaByAddress(known.contacts, address);
    if (contactMeta) {
        return { kind: 'contact', meta: contactMeta };
    }

    const portfolioMeta = findPortfolioMetaByAddress(known.portfolios, address);
    if (portfolioMeta) {
        return { kind: 'portfolio', meta: portfolioMeta };
    }

    return { kind: 'address', label: ellipsisMiddle(address, ADDRESS_ELLIPSIS_CHARS) };
}

export function counterpartyLabelOf(counterparty: ActivityCounterparty): string {
    return 'meta' in counterparty ? counterparty.meta.name : counterparty.label;
}
