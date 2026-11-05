import type { FlameHistoryItem } from '@safely/core';
import { BLOCKCHAIN_NAME } from '@safely/core';
import type { BtcActivityItem } from '@safely/ux';

export type SelectedActivity =
    | { blockchain: BLOCKCHAIN_NAME.BTC; activity: BtcActivityItem }
    | { blockchain: BLOCKCHAIN_NAME.FLAME; activity: FlameHistoryItem };

export function selectedActivityKey(selected: SelectedActivity): string {
    switch (selected.blockchain) {
        case BLOCKCHAIN_NAME.BTC:
            return selected.activity.key;
        case BLOCKCHAIN_NAME.FLAME:
            return selected.activity.txid;
    }
}
