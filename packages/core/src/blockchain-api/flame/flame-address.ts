import { FlameNetwork } from '../../di/safely-flame';

export class FlameAddress {
    public static validForNetwork(address: string): FlameNetwork | null {
        return (
            Object.values(FlameNetwork).find(network => FlameAddress.validate(address, network)) ??
            null
        );
    }

    public static validate(address: string, network: FlameNetwork): boolean {
        try {
            return globalThis.flameSdk.validateReceivingAddress(address, network);
        } catch {
            return false;
        }
    }
}
