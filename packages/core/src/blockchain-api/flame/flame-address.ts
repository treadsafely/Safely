import { hexToBytes } from '@noble/hashes/utils.js';
import { bech32m } from '@scure/base';

import type { FlameNetwork } from '../../di/safely-flame';

// Mainnet HRP is not known yet, so no mainnet address validates
const HRP_BY_NETWORK: Partial<Record<FlameNetwork, string>> = {
    testnet: 'tf'
};

const TRACKING_HRP_BY_NETWORK: Partial<Record<FlameNetwork, string>> = {
    testnet: 'tc'
};

const PAYLOAD_BYTES = 64;

// Longer than bech32's 90-character limit
const MAX_ADDRESS_LENGTH = 200;

export class FlameAddress {
    public static toTracking(predicate: string, network: FlameNetwork): string | null {
        const hrp = TRACKING_HRP_BY_NETWORK[network];
        return hrp ? bech32m.encode(hrp, bech32m.toWords(hexToBytes(predicate))) : null;
    }

    public static splitByTracking(
        address: string,
        tracking: string
    ): { head: string; shared: string; rest: string } {
        const dataStart = address.lastIndexOf('1') + 1;
        const trackingData = tracking.slice(tracking.lastIndexOf('1') + 1);
        let end = dataStart;
        while (end < address.length && address[end] === trackingData[end - dataStart]) {
            end++;
        }
        return {
            head: address.slice(0, dataStart),
            shared: address.slice(dataStart, end),
            rest: address.slice(end)
        };
    }

    public static validate(address: string, network: FlameNetwork): boolean {
        const hrp = HRP_BY_NETWORK[network];
        if (!hrp || !address.startsWith(`${hrp}1`)) {
            return false;
        }

        try {
            const { prefix, words } = bech32m.decode(
                address as `${string}1${string}`,
                MAX_ADDRESS_LENGTH
            );
            return prefix === hrp && bech32m.fromWords(words).length === PAYLOAD_BYTES;
        } catch {
            return false;
        }
    }
}
