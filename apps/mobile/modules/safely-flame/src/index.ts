import { requireNativeModule } from 'expo-modules-core';

export type FlameNetwork = 'mainnet' | 'testnet';

export interface FlameAddress {
    address: string;
    predicate: Uint8Array;
}

export type FlameContractValue =
    | { type: 'clear'; qty: string; flavor: Uint8Array }
    | { type: 'confidential' }
    | { type: 'other' };

export interface FlameContractInfo {
    id: Uint8Array;
    predicate: Uint8Array;
    value: FlameContractValue;
}

export type FlameNoteFailure =
    | 'missing'
    | 'malformed'
    | 'unknownVersion'
    | 'undecryptable'
    | 'openingMismatch'
    | 'notConfidential';

export type FlameNoteOpening =
    | { opened: true; qty: string; flavor: Uint8Array; memo: Uint8Array }
    | { opened: false; failure: FlameNoteFailure }
    | { opened: false; failure: 'error'; error: FlameError };

export type FlameContractDecoding =
    { decoded: true; info: FlameContractInfo } | { decoded: false; error: FlameError };

export type FlameErrorKind =
    | 'invalidMnemonic'
    | 'invalidSeed'
    | 'invalidKey'
    | 'notPermitted'
    | 'invalidAddress'
    | 'invalidKeyPath'
    | 'invalidBytes'
    | 'keyMismatch'
    | 'note'
    | 'transfer'
    | 'invalidArgument'
    | 'internal';

const kindByCode: Record<string, FlameErrorKind> = {
    ERR_FLAME_INVALID_MNEMONIC: 'invalidMnemonic',
    ERR_FLAME_INVALID_SEED: 'invalidSeed',
    ERR_FLAME_INVALID_KEY: 'invalidKey',
    ERR_FLAME_NOT_PERMITTED: 'notPermitted',
    ERR_FLAME_INVALID_ADDRESS: 'invalidAddress',
    ERR_FLAME_INVALID_KEY_PATH: 'invalidKeyPath',
    ERR_FLAME_INVALID_BYTES: 'invalidBytes',
    ERR_FLAME_KEY_MISMATCH: 'keyMismatch',
    ERR_FLAME_NOTE: 'note',
    ERR_FLAME_TRANSFER: 'transfer',
    ERR_FLAME_INVALID_ARGUMENT: 'invalidArgument',
    ERR_FLAME_INTERNAL: 'internal'
};

export class FlameError extends Error {
    public override readonly name = 'FlameError';

    constructor(
        public readonly kind: FlameErrorKind,
        public readonly reason: string
    ) {
        super(`${kind}: ${reason}`);
    }
}

type NativeFailure = { code: string; reason: string };

type NativeOutcome<T> = { ok: true; value: T } | ({ ok: false } & NativeFailure);

type NativeContractDecoding =
    ({ decoded: true } & FlameContractInfo) | ({ decoded: false } & NativeFailure);

type NativeNoteOpening =
    | Exclude<FlameNoteOpening, { failure: 'error' }>
    | ({ opened: false; failure: 'error' } & NativeFailure);

interface SafelyFlameNativeModule {
    viewKey(seed: Uint8Array, network: FlameNetwork): Promise<NativeOutcome<string>>;
    address(
        viewKey: string,
        network: FlameNetwork,
        branch: number,
        index: number
    ): Promise<NativeOutcome<FlameAddress>>;
    decodeContracts(contracts: Uint8Array[]): Promise<NativeOutcome<NativeContractDecoding[]>>;
    openNotes(
        viewKey: string,
        network: FlameNetwork,
        branch: number,
        index: number,
        contracts: Uint8Array[],
        notes: Uint8Array[]
    ): Promise<NativeOutcome<NativeNoteOpening[]>>;
}

const native = requireNativeModule<SafelyFlameNativeModule>('SafelyFlame');

const NETWORKS: readonly string[] = ['mainnet', 'testnet'] satisfies FlameNetwork[];
const UINT32_MAX = 0xffffffff;

const assertUint32 = (name: string, value: number) => {
    if (!Number.isInteger(value) || value < 0 || value > UINT32_MAX) {
        throw new FlameError('invalidArgument', `${name} ${value} is not a uint32`);
    }
};

const assertNetwork = (network: FlameNetwork) => {
    if (!NETWORKS.includes(network)) {
        throw new FlameError('invalidArgument', `unknown network ${String(network)}`);
    }
};

// A polyfilled `Buffer` crashes the bridge: expo-modules-core types arrays by `constructor.name`
const toPlainUint8Array = (bytes: Uint8Array): Uint8Array =>
    bytes.constructor === Uint8Array ? bytes : new Uint8Array(bytes);

const toFlameError = ({ code, reason }: NativeFailure): FlameError =>
    new FlameError(kindByCode[code] ?? 'internal', reason);

const unwrap = async <T>(outcome: Promise<NativeOutcome<T>>): Promise<T> => {
    const result = await outcome;
    if (result.ok) {
        return result.value;
    }
    throw toFlameError(result);
};

export async function deriveViewKey(seed: Uint8Array, network: FlameNetwork): Promise<string> {
    assertNetwork(network);
    const plainSeed = toPlainUint8Array(seed);
    try {
        return await unwrap(native.viewKey(plainSeed, network));
    } finally {
        if (plainSeed !== seed) plainSeed.fill(0);
    }
}

export async function address(
    viewKey: string,
    network: FlameNetwork,
    branch: number,
    index: number
): Promise<FlameAddress> {
    assertNetwork(network);
    assertUint32('branch', branch);
    assertUint32('index', index);
    return unwrap(native.address(viewKey, network, branch, index));
}

export async function decodeContracts(contracts: Uint8Array[]): Promise<FlameContractDecoding[]> {
    const decodings = await unwrap(native.decodeContracts(contracts.map(toPlainUint8Array)));
    return decodings.map(decoding =>
        decoding.decoded
            ? {
                  decoded: true,
                  info: { id: decoding.id, predicate: decoding.predicate, value: decoding.value }
              }
            : { decoded: false, error: toFlameError(decoding) }
    );
}

export async function openNotes(
    viewKey: string,
    network: FlameNetwork,
    branch: number,
    index: number,
    outputs: { contract: Uint8Array; note: Uint8Array | null }[]
): Promise<FlameNoteOpening[]> {
    assertNetwork(network);
    assertUint32('branch', branch);
    assertUint32('index', index);
    const openings = await unwrap(
        native.openNotes(
            viewKey,
            network,
            branch,
            index,
            outputs.map(({ contract }) => toPlainUint8Array(contract)),
            outputs.map(({ note }) => (note ? toPlainUint8Array(note) : new Uint8Array(0)))
        )
    );
    return openings.map(opening =>
        !opening.opened && opening.failure === 'error'
            ? { opened: false, failure: 'error', error: toFlameError(opening) }
            : opening
    );
}
