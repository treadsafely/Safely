import { useMemo } from 'react';

import { useActiveFlameWallet } from '../../entities';

export function useFlameReceiveInfo() {
    const wallet = useActiveFlameWallet();

    return useMemo(
        () => ({
            displayAddress: wallet.receivingAddress,
            trackingAddress: wallet.trackingAddress
        }),
        [wallet.receivingAddress, wallet.trackingAddress]
    );
}
