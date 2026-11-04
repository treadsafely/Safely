import type { FC } from 'react';
import { useState } from 'react';

import type { ILedgerDerivation, PortfolioLedger, PortfolioMeta } from '@safely/core';
import {
    SecurityCheckCancelledError,
    useErrorToast,
    useHideDerivation,
    useToast,
    useTranslate,
    useUpdateDerivationMeta
} from '@safely/ux';

import { DerivedWalletRow } from './DerivedWalletRow';
import { findMoreStyles } from './DerivedWalletsList.styles';
import { HideDerivationModal } from './HideDerivationModal';
import { CustomizeWalletModal } from '../../entities';
import { Button, List } from '../../shared';

export type DerivedWalletsListProps = {
    portfolio: PortfolioLedger;
    onFindMore: () => void;
};

export const DerivedWalletsList: FC<DerivedWalletsListProps> = ({ portfolio, onFindMore }) => {
    const t = useTranslate();
    const toast = useToast();
    const errorToast = useErrorToast({});
    const { mutateAsync: updateDerivationMeta } = useUpdateDerivationMeta();
    const { mutateAsync: hideDerivation } = useHideDerivation();

    const [hiding, setHiding] = useState<ILedgerDerivation | null>(null);
    const [editing, setEditing] = useState<ILedgerDerivation | null>(null);

    const derivations = portfolio.getDerivations();

    const requestHide = (derivation: ILedgerDerivation): void => {
        if (derivations.length <= 1) {
            toast(t('derivedWallets.cannotRemoveLast'));
            return;
        }

        setHiding(derivation);
    };

    const hide = async (derivation: ILedgerDerivation): Promise<void> => {
        setHiding(null);

        try {
            await hideDerivation({ portfolio, derivationIndex: derivation.index });
            toast(t('removeWallet.toastMessages.walletRemoved'));
        } catch (error) {
            if (!(error instanceof SecurityCheckCancelledError)) {
                errorToast(error);
            }
        }
    };

    const saveName = async (
        derivation: ILedgerDerivation,
        meta: Pick<PortfolioMeta, 'name'>
    ): Promise<void> => {
        setEditing(null);

        try {
            await updateDerivationMeta({
                portfolio,
                derivationIndex: derivation.index,
                name: meta.name
            });
        } catch (error) {
            errorToast(error);
        }
    };

    return (
        <>
            <List.Title>{t('settings.groups.derivedWallets.title')}</List.Title>
            <List.Group variant="separated">
                {derivations.map(derivation => (
                    <DerivedWalletRow
                        key={derivation.index}
                        derivation={derivation}
                        onEdit={() => setEditing(derivation)}
                        onHide={() => requestHide(derivation)}
                    />
                ))}
            </List.Group>

            <div className={findMoreStyles}>
                <Button variant="secondary" size="xsmall" onClick={onFindMore}>
                    {t('derivedWallets.findMore')}
                </Button>
            </div>

            {editing !== null && (
                <CustomizeWalletModal
                    tag={editing.index + 1}
                    defaultName={editing.meta.name}
                    defaultIcon={portfolio.meta.icon}
                    onSave={meta => void saveName(editing, meta)}
                    onClose={() => setEditing(null)}
                />
            )}

            {hiding !== null && (
                <HideDerivationModal
                    derivation={hiding}
                    onHide={() => void hide(hiding)}
                    onClose={() => setHiding(null)}
                />
            )}
        </>
    );
};
