import { useMemo } from 'react';

import type { Recipient } from '@safely/core';
import { BLOCKCHAIN_NAME, PortfolioNetworkType } from '@safely/core';

import {
    isDerivableEntities,
    useActivePortfolioEntities,
    useContacts,
    usePortfolios
} from '../../../../entities';
import { useTranslate } from '../../../../shared';
import type { ContactSuggestion, PortfolioSuggestion } from '../types';
import { mapContactToSuggestions, mapPortfolioToSuggestions } from '../utils';

export interface SendFormSuggestions {
    portfolioSuggestions: PortfolioSuggestion[];
    contactSuggestions: ContactSuggestion[];
}

export function useSendFormSuggestions(
    blockchains: readonly Recipient['blockchain'][]
): SendFormSuggestions {
    const t = useTranslate();
    const contacts = useContacts();
    const entities = useActivePortfolioEntities();
    const portfolios = usePortfolios();

    const networkType = entities.portfolio.networkType;

    const activePortfolio = useMemo(
        () => ({
            portfolioId: entities.portfolio.id,
            derivation: isDerivableEntities(entities) ? entities.derivation : undefined
        }),
        [entities]
    );

    const portfolioSuggestions = useMemo(
        () =>
            portfolios
                .filter(p => p.networkType === networkType)
                .flatMap(p =>
                    blockchains.flatMap(blockchain =>
                        mapPortfolioToSuggestions(
                            p,
                            activePortfolio,
                            number => t('portfolio.ledgerWallet', { number }),
                            blockchain
                        )
                    )
                ),
        [portfolios, activePortfolio, networkType, t, blockchains]
    );

    const contactSuggestions = useMemo(
        () =>
            networkType === PortfolioNetworkType.TESTNET ||
            !blockchains.includes(BLOCKCHAIN_NAME.BTC)
                ? []
                : contacts.flatMap(c => mapContactToSuggestions(c)),
        [contacts, networkType, blockchains]
    );

    return { portfolioSuggestions, contactSuggestions };
}
