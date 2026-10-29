import type { FlameNetwork } from '../di/safely-flame';
import type { BtcNetwork } from '../entities';

export interface BtcTransferScheme {
    name: 'btc-transfer';
    parsed: {
        address: string;
        network: BtcNetwork;
        amount?: string;
        label?: string;
        message?: string;
    };
}

export interface FlameTransferScheme {
    name: 'flame-transfer';
    parsed: {
        address: string;
        network: FlameNetwork;
        amount?: string;
    };
}

export type ExternalInputScheme = BtcTransferScheme | FlameTransferScheme;
export type ExternalInputSchemeName = ExternalInputScheme['name'];

export type SchemeByName<SName extends ExternalInputSchemeName = ExternalInputSchemeName> = Extract<
    ExternalInputScheme,
    { name: SName }
>;
