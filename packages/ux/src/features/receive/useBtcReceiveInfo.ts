import { useMemo } from 'react';

import { useActiveBtcWallet } from '../../entities';

export function useBtcReceiveInfo() {
    const wallet = useActiveBtcWallet();

    return useMemo(
        () => ({
            displayAddress: wallet.address
        }),
        [wallet.address]
    );
}
