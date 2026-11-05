import { useMemo } from 'react';

import type { Portfolio, PortfolioLedger } from '@safely/core';
import { PortfolioNetworkType, PortfolioType } from '@safely/core';

const findLedgerPortfolio = (
    portfolios: Portfolio[],
    predicate: (portfolio: PortfolioLedger) => boolean
): PortfolioLedger | undefined =>
    portfolios.find(
        (portfolio): portfolio is PortfolioLedger =>
            portfolio.type === PortfolioType.LEDGER && predicate(portfolio)
    );

export const useLedgerImportTarget = (params: {
    portfolios: Portfolio[];
    findMorePortfolioId: string | null;
    masterFingerprint: Buffer | undefined;
}) => {
    const { portfolios, findMorePortfolioId, masterFingerprint } = params;

    const findMorePortfolio = useMemo(
        () =>
            findMorePortfolioId === null
                ? undefined
                : findLedgerPortfolio(
                      portfolios,
                      portfolio => portfolio.id.toString() === findMorePortfolioId
                  ),
        [portfolios, findMorePortfolioId]
    );

    const existingPortfolio = useMemo(
        () =>
            masterFingerprint === undefined
                ? undefined
                : findLedgerPortfolio(
                      portfolios,
                      portfolio =>
                          portfolio.networkType === PortfolioNetworkType.MAINNET &&
                          portfolio.masterFingerprint.equals(masterFingerprint)
                  ),
        [portfolios, masterFingerprint]
    );

    const targetPortfolio = findMorePortfolio ?? existingPortfolio;

    const existingIndexes = useMemo(
        () => existingPortfolio?.getDerivations().map(derivation => derivation.index) ?? [],
        [existingPortfolio]
    );

    const existingNames = useMemo(
        () =>
            new Map(
                targetPortfolio
                    ?.getDerivations()
                    .map(derivation => [derivation.index, derivation.meta.name]) ?? []
            ),
        [targetPortfolio]
    );

    const isWrongDevice =
        masterFingerprint !== undefined &&
        findMorePortfolio !== undefined &&
        !masterFingerprint.equals(findMorePortfolio.masterFingerprint);

    return { targetPortfolio, existingIndexes, existingNames, isWrongDevice };
};
