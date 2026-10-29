import { FlameNetwork } from '../../di/safely-flame';

export class FlameAddress {
    public static validForNetwork(address: string): FlameNetwork | null {
        try {
            return (
                Object.values(FlameNetwork).find(network =>
                    FlameAddress.validate(address, network)
                ) ?? null
            );
        } catch {
            return null;
        }
    }

    public static validate(address: string, network: FlameNetwork): boolean {
        return globalThis.flameSdk.validateReceivingAddress(address, network);
    }
}
