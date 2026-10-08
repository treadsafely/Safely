export type FlameNetwork = 'mainnet' | 'testnet';

export interface FlameKeyPath {
    branch: number;
    index: number;
}

export interface FlameIssuedAddress {
    address: string;
    predicate: Uint8Array;
}

export type FlameContractValue =
    | { type: 'clear'; qty: bigint; flavor: Uint8Array }
    | { type: 'confidential' }
    | { type: 'other' };

export interface FlameContractInfo {
    id: Uint8Array;
    predicate: Uint8Array;
    value: FlameContractValue;
}

export type FlameContractDecoding =
    { decoded: true; info: FlameContractInfo } | { decoded: false; reason: string };

export interface FlameNoteInput {
    contract: Uint8Array;
    note: Uint8Array | null;
}

export type FlameNoteFailure =
    | 'missing'
    | 'malformed'
    | 'unknownVersion'
    | 'undecryptable'
    | 'openingMismatch'
    | 'notConfidential';

export type FlameNoteOpening =
    | { opened: true; qty: bigint; flavor: Uint8Array; memo: Uint8Array }
    | { opened: false; failure: FlameNoteFailure }
    | { opened: false; failure: 'error'; reason: string };

export interface SafelyFlame {
    viewKey(seed: Uint8Array, network: FlameNetwork): Promise<string>;
    address(
        viewKey: string,
        network: FlameNetwork,
        path: FlameKeyPath
    ): Promise<FlameIssuedAddress>;
    decodeContracts(contracts: Uint8Array[]): Promise<FlameContractDecoding[]>;
    openNotes(
        viewKey: string,
        network: FlameNetwork,
        path: FlameKeyPath,
        notes: FlameNoteInput[]
    ): Promise<FlameNoteOpening[]>;
}

declare global {
    var flameSdk: SafelyFlame;
}
