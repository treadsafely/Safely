export type FlameNetwork = 'mainnet' | 'testnet';

export interface FlameKeyPath {
    branch: number;
    index: number;
}

export interface FlameIssuedAddress {
    receivingAddress: string;
    trackingAddress: string;
    predicate: Uint8Array;
}

export type FlameContractValue =
    | { type: 'clear'; qty: bigint; flavor: Uint8Array; isNative: boolean }
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
    | { opened: true; qty: bigint; flavor: Uint8Array; isNative: boolean; memo: Uint8Array }
    | { opened: false; failure: FlameNoteFailure }
    | { opened: false; failure: 'error'; reason: string };

export interface FlameTransferInput {
    contract: Uint8Array;
    note: Uint8Array | null;
    proof: Uint8Array;
}

export interface FlameTransferOutput {
    address: string;
    qty: bigint;
    memo?: Uint8Array;
}

export interface FlameTransferRequest {
    inputs: FlameTransferInput[];
    outputs: FlameTransferOutput[];
    fee: bigint;
    gas: bigint;
}

export interface FlameBuiltTransfer {
    txid: Uint8Array;
    blockTx: Uint8Array;
}

export interface SafelyFlame {
    viewKey(seed: Uint8Array, network: FlameNetwork): Promise<string>;
    address(
        viewKey: string,
        network: FlameNetwork,
        path: FlameKeyPath
    ): Promise<FlameIssuedAddress>;
    validateReceivingAddress(address: string, network: FlameNetwork): boolean;
    memoMaxBytes(): number;
    decodeContracts(contracts: Uint8Array[]): Promise<FlameContractDecoding[]>;
    openNotes(
        viewKey: string,
        network: FlameNetwork,
        path: FlameKeyPath,
        notes: FlameNoteInput[]
    ): Promise<FlameNoteOpening[]>;
    buildTransfer(
        seed: Uint8Array,
        network: FlameNetwork,
        path: FlameKeyPath,
        request: FlameTransferRequest
    ): Promise<FlameBuiltTransfer>;
}

declare global {
    var flameSdk: SafelyFlame;
}
