import type { NewActivityPollingParams } from './useNewActivityPolling';
import { useNewActivityPolling } from './useNewActivityPolling';
import type { FlameHistoryData } from '../../entities';
import { flameBlockchain, useFlameHistory } from '../../entities';

const firstActivityKey = (data: FlameHistoryData) => data.pages[0]?.items[0]?.txid;

export function useFlameHistoryPolling(params: NewActivityPollingParams): void {
    useNewActivityPolling(useFlameHistory(), firstActivityKey, {
        ...params,
        invalidateOnNew: flameBlockchain.outputs.toKey()
    });
}
