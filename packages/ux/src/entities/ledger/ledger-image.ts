import { DeviceModelId } from '@ledgerhq/device-management-kit';

export type LedgerImageKey = 'stax' | 'flex' | 'nanoX' | 'nanoGen5' | 'preview';

const MODEL_IMAGE: Partial<Record<DeviceModelId, LedgerImageKey>> = {
    [DeviceModelId.STAX]: 'stax',
    [DeviceModelId.FLEX]: 'flex',
    [DeviceModelId.NANO_X]: 'nanoX',
    [DeviceModelId.NANO_S]: 'nanoGen5'
};

export const getLedgerImageKey = (model?: string): LedgerImageKey =>
    (model && MODEL_IMAGE[model as DeviceModelId]) || 'preview';
