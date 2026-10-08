import type { FC } from 'react';

import { PortfolioNetworkType } from '@safely/core';
import { useToast, useTranslate } from '@safely/ux';

import { AddWalletModal } from './AddWalletModal';
import { ImportWalletModal } from './ImportWalletModal';
import type { useAddWalletFlow } from './useAddWalletFlow';
import { WalletAlreadyAddedModal } from './WalletAlreadyAddedModal';
import { WatchAccountModal } from './WatchAccountModal';
import { CustomizeWalletModal } from '../../entities';

export type AddWalletModalsProps = {
    flow: ReturnType<typeof useAddWalletFlow>;
};

export const AddWalletModals: FC<AddWalletModalsProps> = ({ flow }) => {
    const t = useTranslate();
    const toast = useToast();

    switch (flow.step) {
        case 'menu':
            return (
                <AddWalletModal
                    onCreateNew={flow.startCreate}
                    onImportExisting={() => flow.openImport(PortfolioNetworkType.MAINNET)}
                    onWatchAccount={flow.openWatch}
                    onConnectLedger={() =>
                        toast({ message: t('common.errors.notSupportedYet'), type: 'error' })
                    }
                    onImportTestnet={() => flow.openImport(PortfolioNetworkType.TESTNET)}
                    onClose={flow.close}
                />
            );
        case 'import':
            return (
                <ImportWalletModal
                    onSubmit={mnemonic => void flow.onMnemonicReady(mnemonic)}
                    onClose={flow.open}
                />
            );
        case 'watch':
            return <WatchAccountModal onSubmit={flow.onWatchInputReady} onClose={flow.open} />;
        case 'duplicate':
            return (
                flow.duplicate && (
                    <WalletAlreadyAddedModal
                        meta={flow.duplicate.meta}
                        onOpen={() => void flow.openDuplicate()}
                        onEdit={flow.editDuplicate}
                        onClose={flow.close}
                    />
                )
            );
        case 'customize':
            return (
                flow.draft && (
                    <CustomizeWalletModal
                        defaultName={flow.draft.name}
                        defaultIcon={flow.draft.icon}
                        onSave={meta => void flow.save(meta).catch(() => undefined)}
                        onClose={flow.open}
                    />
                )
            );
        default:
            return null;
    }
};
