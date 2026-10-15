import { useMemo } from 'react';

import { BLOCKCHAIN_NAME, PortfolioNetworkType } from '@safely/core';

import {
    isDerivableEntities,
    useActivePortfolioEntities,
    useContacts,
    usePortfolios
} from '../../../../entities';
import { useTranslate } from '../../../../shared';
import { detectAddressType } from '../../../../shared/address';
import type { ContactSuggestion, PortfolioSuggestion } from '../types';
import { mapContactToSuggestions, mapPortfolioToSuggestions } from '../utils';

export interface SendFormSuggestions {
    portfolioSuggestions: PortfolioSuggestion[];
    contactSuggestions: ContactSuggestion[];
}

export function useSendFormSuggestions(
    blockchain: BLOCKCHAIN_NAME = BLOCKCHAIN_NAME.BTC
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
                    mapPortfolioToSuggestions(
                        p,
                        activePortfolio,
                        number => t('portfolio.ledgerWallet', { number }),
                        blockchain
                    )
                ),
        [portfolios, activePortfolio, networkType, t, blockchain]
    );

    const contactSuggestions = useMemo(
        () =>
            networkType === PortfolioNetworkType.TESTNET
                ? []
                : contacts
                      .flatMap(c => mapContactToSuggestions(c))
                      .filter(
                          s =>
                              blockchain === BLOCKCHAIN_NAME.BTC ||
                              detectAddressType(s.address, networkType)?.blockchain === blockchain
                      ),
        [contacts, networkType, blockchain]
    );

    return { portfolioSuggestions, contactSuggestions };
}
