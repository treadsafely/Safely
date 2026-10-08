/* eslint-disable @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/dot-notation */
import { ed25519 } from '@noble/curves/ed25519.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { HDKey } from '@scure/bip32';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { hex, toUtf8, utf8 } from '@safely/sync/buffer';

import { AUTH_CERT_CHILD_INDEX, CERT_DOMAIN } from './const';
import { ReadOnlyRequestSigner } from './read-only-request-signer';

describe('AuthCert', () => {
    it('should create an instance of AuthCert, sign and verify it', async () => {
        const hdKey = HDKey.fromMasterSeed(Buffer.alloc(32, 0x01));
        const credential = ReadOnlyRequestSigner.createCredential(hdKey);

        const signer = new ReadOnlyRequestSigner(() => Promise.resolve(credential));
        const method = 'GET';
        const pathWithQuery = '/test/path?query=1';
        const body = 'test-body';

        const authHeader = await signer.sign(method, pathWithQuery, body);

        validateRequest({
            signer,
            authorization: authHeader,
            method,
            pathWithQuery,
            bodyBytes: utf8(body)
        });
    });
});

describe('AuthCert key hygiene', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('wipes the derived auth cert node and leaves the account node intact', () => {
        const accountNode = HDKey.fromMasterSeed(Buffer.alloc(32, 0x01));
        // An independent node with the same key material, so the intercepted
        // derivation can be delegated without recursing into the spy.
        const twin = HDKey.fromExtendedKey(accountNode.privateExtendedKey);

        const derived: HDKey[] = [];
        vi.spyOn(accountNode, 'deriveChild').mockImplementation(index => {
            const child = twin.deriveChild(index);
            derived.push(child);
            return child;
        });

        const credential = ReadOnlyRequestSigner.createCredential(accountNode);

        expect(derived).toHaveLength(1);
        expect(derived[0].privateKey).toBeNull();
        // The account node belongs to the caller, and the request key is the
        // long-lived secret the credential is built around.
        expect(accountNode.privateKey).not.toBeNull();
        expect(credential.reqSecretKey.some(byte => byte !== 0)).toBe(true);
    });
});

function validateRequest(input: {
    signer: ReadOnlyRequestSigner;
    authorization: string;
    method: string;
    pathWithQuery: string;
    bodyBytes: Uint8Array;
}) {
    const parsed = parseAuthorizationHeader(input.authorization);

    const certBytes = hex(parsed.certHex);

    const { certSig, certBody: certBodyBytes } = parseCertEnvelope(certBytes);
    const certBody = parseCertBody(certBodyBytes);

    const authCertNode = deriveAuthCertNodeFromXpub(certBody.xpub);
    const authCertPub = authCertNode.publicKey!;

    const certToVerify = Buffer.concat([utf8(CERT_DOMAIN), Uint8Array.of(0x00), certBodyBytes]);
    const certMsgHash = sha256(certToVerify);

    expect(
        secp256k1.verify(certSig, certMsgHash, authCertPub, {
            prehash: false,
            format: 'compact'
        })
    ).toBeTruthy();

    const reqPublicKey = hex(certBody.req_pub);

    const bodyBytes = input.bodyBytes ?? new Uint8Array();

    const reqToVerify = input.signer['buildSigningPayload']({
        method: input.method,
        pathWithQuery: input.pathWithQuery,
        bodyBytes,
        ts: parsed.ts,
        nonce: parsed.nonce,
        certBytes
    });
    const reqSig = hex(parsed.sigHex);

    expect(
        ed25519.verify(reqSig, reqToVerify, reqPublicKey, {
            zip215: false
        })
    ).toBeTruthy();
}

function parseAuthorizationHeader(header: string): {
    certHex: string;
    ts: number;
    nonce: number;
    sigHex: string;
} {
    const re =
        /^Safely-RO cert=(?<cert>[a-f0-9]+),nonce=(?<nonce>\d+),timestamp=(?<ts>\d+),sig=(?<sig>[a-f0-9]+)$/;
    const m = header.match(re)!;

    const [, certHex, nonceRaw, tsRaw, sigHex] = m;
    const ts = Number(tsRaw);
    const nonce = Number(nonceRaw);

    return { certHex, ts, nonce, sigHex };
}

function parseCertEnvelope(certBytes: Uint8Array): {
    certBody: Uint8Array;
    certSig: Uint8Array;
} {
    const certSig = certBytes.slice(0, 64);
    const certBody = certBytes.slice(64);

    return { certBody, certSig };
}

function parseCertBody(certBodyBytes: Uint8Array): ReadOnlyCertBody {
    const obj = JSON.parse(toUtf8(certBodyBytes));

    expect(obj.v).toEqual(1);
    expect(obj.typ).toEqual('wallet-http-ro');
    expect(obj.alg).toEqual('ed25519');

    return obj as ReadOnlyCertBody;
}

function deriveAuthCertNodeFromXpub(accountXpub: string): HDKey {
    const accountNode = HDKey.fromExtendedKey(accountXpub);
    return accountNode.deriveChild(AUTH_CERT_CHILD_INDEX);
}

interface ReadOnlyCertBody {
    v: 1;
    typ: 'wallet-http-ro';
    alg: 'ed25519';
    xpub: string; // standard BIP32 xpub
    req_pub: string; // hex, 32 bytes => 64 hex chars
}
