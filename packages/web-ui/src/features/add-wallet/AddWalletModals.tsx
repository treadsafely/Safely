import type { FC } from 'react';

import { PortfolioNetworkType } from '@safely/core';

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
    switch (flow.step) {
        case 'menu':
            return (
                <AddWalletModal
                    onCreateNew={flow.startCreate}
                    onImportExisting={() => flow.openImport(PortfolioNetworkType.MAINNET)}
                    onWatchAccount={flow.openWatch}
                    onImportTestnet={() => flow.openImport(PortfolioNetworkType.TESTNET)}
                    onClose={flow.close}
                />
            );
        case 'import':
            return (
                <ImportWalletModal
                    onSubmit={mnemonic => void flow.onMnemonicReady(mnemonic)}
                    onBack={flow.open}
                />
            );
        case 'watch':
            return <WatchAccountModal onSubmit={flow.onWatchInputReady} onBack={flow.open} />;
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
