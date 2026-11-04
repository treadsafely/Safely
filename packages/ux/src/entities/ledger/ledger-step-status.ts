export type LedgerStepStatus = 'pending' | 'active' | 'done' | 'error';

export type LedgerStep = {
    label: string;
    status: LedgerStepStatus;
};

export const resolveLedgerStepStatus = (
    index: number,
    current: number,
    isFailed: boolean
): LedgerStepStatus => {
    if (index < current) {
        return 'done';
    }

    if (index === current) {
        return isFailed ? 'error' : 'active';
    }

    return 'pending';
};
