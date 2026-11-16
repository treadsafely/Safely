import { DeviceModelId } from '@ledgerhq/device-management-kit';

const MODEL_LABEL: Partial<Record<DeviceModelId, string>> = {
    [DeviceModelId.STAX]: 'Stax',
    [DeviceModelId.FLEX]: 'Flex',
    [DeviceModelId.NANO_X]: 'Nano X',
    [DeviceModelId.NANO_S]: 'Nano S',
    [DeviceModelId.NANO_SP]: 'Nano S Plus'
};

export const getLedgerModelLabel = (model?: string): string =>
    (model && MODEL_LABEL[model as DeviceModelId]) || '';

export const getLedgerModelName = (model?: string): string => {
    const label = getLedgerModelLabel(model);

    return label ? `Ledger ${label}` : 'Ledger';
};

export const getLedgerWalletName = (model: string | undefined, fallbackNumber: number): string => {
    const modelName = getLedgerModelName(model);

    return modelName === 'Ledger' ? `Ledger ${fallbackNumber}` : modelName;
};
