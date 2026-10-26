import type { FlameNetwork } from '../../di/safely-flame';

export class FlameAddress {
    public static validate(address: string, network: FlameNetwork): boolean {
        return globalThis.flameSdk.validateReceivingAddress(address, network);
    }
}
