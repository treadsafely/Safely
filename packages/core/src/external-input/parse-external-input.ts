import {
    ParserInvalidAmountError,
    ParserUnrecognizedError,
    ParserUnsupportedMemoError,
    ParserUnsupportedSchemeError
} from './errors';
import type {
    BtcTransferScheme,
    ExternalInputScheme,
    ExternalInputSchemeName,
    FlameTransferScheme
} from './schemes';
import { BtcAddress } from '../blockchain-api/btc/btc-address';
import { FlameAddress } from '../blockchain-api/flame/flame-address';
import { BTC_ASSET } from '../entities/asset/btc-asset';
import { FLAME_ASSET } from '../entities/asset/flame-asset';
import { CANONICAL_DECIMAL_REGEX } from '../utils/format/number-formatter';
import { toBig } from '../utils/number';

type Parser = (raw: string) => ExternalInputScheme | null;

type NetworkDetector<Network> = (address: string) => Network | null;

interface AddressTarget<Network> {
    address: string;
    network: Network;
}

interface PaymentUri<Network> {
    target: AddressTarget<Network>;
    params: URLSearchParams;
}

const detectBtcNetwork: NetworkDetector<BtcTransferScheme['parsed']['network']> = address =>
    BtcAddress.validForNetwork(address);

const detectFlameNetwork: NetworkDetector<FlameTransferScheme['parsed']['network']> = address =>
    FlameAddress.validForNetwork(address);

function matchAddress<Network>(
    address: string,
    detectNetwork: NetworkDetector<Network>
): AddressTarget<Network> | null {
    const network = detectNetwork(address);

    return network === null ? null : { address, network };
}

function matchPaymentUri<Network>(
    raw: string,
    prefix: string,
    detectNetwork: NetworkDetector<Network>
): PaymentUri<Network> | null {
    if (!raw.toLowerCase().startsWith(prefix)) {
        return null;
    }

    const [address, queryString] = raw.slice(prefix.length).split('?', 2);

    if (!address) {
        return null;
    }

    const target = matchAddress(address, detectNetwork);

    return target && { target, params: new URLSearchParams(queryString) };
}

function parseUriAmount(raw: string, decimals: number): string {
    if (!CANONICAL_DECIMAL_REGEX.test(raw)) {
        throw new ParserInvalidAmountError();
    }

    const value = toBig(raw);
    if (value.lte(0) || !value.eq(value.round(decimals, 0))) {
        throw new ParserInvalidAmountError();
    }

    return raw;
}

const parseBip21: Parser = raw => {
    const uri = matchPaymentUri(raw, 'bitcoin:', detectBtcNetwork);
    if (!uri) {
        return null;
    }

    const parsed: BtcTransferScheme['parsed'] = { ...uri.target };

    const amount = uri.params.get('amount');
    if (amount !== null) parsed.amount = parseUriAmount(amount, BTC_ASSET.decimals);

    const label = uri.params.get('label');
    if (label) parsed.label = label;

    const message = uri.params.get('message');
    if (message) parsed.message = message;

    return { name: 'btc-transfer', parsed };
};

const parseFlameUri: Parser = raw => {
    const uri = matchPaymentUri(raw, 'flame:', detectFlameNetwork);
    if (!uri) {
        return null;
    }

    if (uri.params.has('memo')) {
        throw new ParserUnsupportedMemoError();
    }

    const parsed: FlameTransferScheme['parsed'] = { ...uri.target };

    const amount = uri.params.get('amount');
    if (amount !== null) parsed.amount = parseUriAmount(amount, FLAME_ASSET.decimals);

    return { name: 'flame-transfer', parsed };
};

const parseBtcAddress: Parser = raw => {
    const target = matchAddress(raw, detectBtcNetwork);

    return target && { name: 'btc-transfer', parsed: target };
};

const parseFlameAddress: Parser = raw => {
    const target = matchAddress(raw, detectFlameNetwork);

    return target && { name: 'flame-transfer', parsed: target };
};

export function parseExternalInput(
    raw: string,
    allowedSchemes?: readonly ExternalInputSchemeName[]
) {
    const input = raw.trim();
    const parsers: Parser[] = [parseBip21, parseFlameUri, parseBtcAddress, parseFlameAddress];

    for (const parser of parsers) {
        const scheme = parser(input);
        if (!scheme) continue;

        if (allowedSchemes && !allowedSchemes.includes(scheme.name)) {
            throw new ParserUnsupportedSchemeError();
        }

        return scheme;
    }

    throw new ParserUnrecognizedError();
}
