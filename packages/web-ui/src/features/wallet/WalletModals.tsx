import type { FC } from 'react';

import { PortfolioType } from '@safely/core';
import { useTranslate } from '@safely/ux';

import { RecoveryPhraseFlow } from './RecoveryPhraseFlow';
import { RemoveWalletModal } from './RemoveWalletModal';
import { SelectWalletModal } from './SelectWalletModal';
import type { useWalletFlow } from './useWalletFlow';
import { CustomizeWalletModal } from '../../entities';
import { LedgerModals } from '../ledger';

export type WalletModalsProps = {
    flow: ReturnType<typeof useWalletFlow>;
};

export const WalletModals: FC<WalletModalsProps> = ({ flow }) => {
    const { portfolio } = flow;

    const t = useTranslate();

    if (portfolio === null) {
        return null;
    }

    switch (flow.step) {
        case 'select':
            return (
                <SelectWalletModal
                    activePortfolioId={portfolio.id}
                    onSelect={(selected, derivationIndex) =>
                        void flow.select(selected.id, derivationIndex)
                    }
                    onClose={flow.close}
                />
            );
        case 'edit':
            return (
                <CustomizeWalletModal
                    title={
                        portfolio.type === PortfolioType.LEDGER
                            ? t('customizeWallet.ledgerTitle')
                            : undefined
                    }
                    defaultName={portfolio.meta.name}
                    defaultIcon={portfolio.meta.icon}
                    onSave={meta => void flow.saveMeta(meta)}
                    onClose={flow.close}
                />
            );
        case 'reveal':
            return <RecoveryPhraseFlow portfolio={portfolio} onClose={flow.close} />;
        case 'findMore':
            return <LedgerModals flow={flow.ledger} />;
        case 'remove':
            return (
                <RemoveWalletModal
                    portfolio={portfolio}
                    onRemove={() => void flow.remove()}
                    onBackUp={flow.openReveal}
                    onClose={flow.close}
                />
            );
        default:
            return null;
    }
};
