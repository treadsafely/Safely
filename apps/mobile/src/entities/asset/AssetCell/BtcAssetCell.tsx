import { useMemo } from 'react';

import { useActiveBtcWalletUtxo, useOnrampTxids } from '@safely/ux';

import type { AssetCellProps } from './AssetCell';
import { AssetCell } from './AssetCell';
import { ReceivingBadges } from './ReceivingBadge';

type BtcAssetCellProps = Omit<AssetCellProps, 'image' | 'footer'>;

export const BtcAssetCell = (props: BtcAssetCellProps) => {
    const purchaseTxids = useOnrampTxids();
    const { data: btcUtxo } = useActiveBtcWalletUtxo();

    const receivingUtxos = useMemo(() => btcUtxo?.unconfirmedUnsafe.utxos ?? [], [btcUtxo]);

    return (
        <AssetCell
            {...props}
            image={{ type: 'image', image: props.cryptoAssetAmount.asset.image }}
            footer={
                receivingUtxos.length > 0 && (
                    <ReceivingBadges utxos={receivingUtxos} purchaseTxids={purchaseTxids} />
                )
            }
        />
    );
};
