import { ed25519 } from '@noble/curves/ed25519.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import type { HDKey } from '@scure/bip32';

import { hex, toHex, u16be, u32be, u64be, u8be, utf8 } from '@safely/sync/buffer';

import { AUTH_CERT_CHILD_INDEX, CERT_DOMAIN, REQ_DOMAIN, SEED_INFO } from './const';
import type { RequestSigner } from '../../utils/fetch';

export interface ReadOnlyCredential {
    certHex: string;
    reqSecretKey: Uint8Array;
}

export class ReadOnlyRequestSigner implements RequestSigner {
    #credential?: Promise<ReadOnlyCredential>;

    constructor(private readonly credentialProvider: () => Promise<ReadOnlyCredential>) {}

    public static createCredential(accountNode: HDKey): ReadOnlyCredential {
        const authCertNode = accountNode.deriveChild(AUTH_CERT_CHILD_INDEX);

        try {
            if (!authCertNode.privateKey) {
                throw new Error('Auth cert node has no private key.');
            }

            const { secretKey: reqSecretKey, publicKey: reqPublicKey } =
                ReadOnlyRequestSigner.deriveRequestKeypair(authCertNode.privateKey);

            const certBody = {
                v: 1,
                typ: 'wallet-http-ro',
                alg: 'ed25519',
                xpub: accountNode.publicExtendedKey,
                req_pub: toHex(reqPublicKey)
            };

            const certBodyBytes = utf8(JSON.stringify(certBody));
            const certToSign = Buffer.concat([
                utf8(CERT_DOMAIN),
                Uint8Array.of(0x00),
                certBodyBytes
            ]);
            const certSig = secp256k1.sign(sha256(certToSign), authCertNode.privateKey, {
                prehash: false,
                format: 'compact'
            });

            return {
                reqSecretKey,
                certHex: toHex(Buffer.concat([certSig, certBodyBytes]))
            };
        } finally {
            authCertNode.wipePrivateData();
        }
    }

    public async sign(method: string, pathWithQuery: string, body: string): Promise<string> {
        const { certHex, reqSecretKey } = await this.resolve();

        const ts = Math.floor(Date.now() / 1000);
        const nonce = ReadOnlyRequestSigner.generateNonce();

        const payload = this.buildSigningPayload({
            method,
            pathWithQuery,
            bodyBytes: utf8(body),
            ts,
            nonce,
            certBytes: hex(certHex)
        });

        const signature = ed25519.sign(payload, reqSecretKey);

        return (
            `Safely-RO cert=${certHex},` +
            `nonce=${nonce},` +
            `timestamp=${ts},` +
            `sig=${toHex(signature)}`
        );
    }

    private buildSigningPayload(input: {
        method: string;
        pathWithQuery: string;
        bodyBytes: Uint8Array;
        ts: number;
        nonce: number;
        certBytes: Uint8Array;
    }): Uint8Array {
        const methodBytes = utf8(input.method.toUpperCase());
        const pathBytes = utf8(input.pathWithQuery);

        return Buffer.concat([
            utf8(REQ_DOMAIN),
            u8be(0x00),
            u16be(methodBytes.length),
            methodBytes,
            u16be(pathBytes.length),
            pathBytes,
            sha256(input.bodyBytes),
            u64be(input.ts),
            u32be(input.nonce),
            sha256(input.certBytes)
        ]);
    }

    private resolve(): Promise<ReadOnlyCredential> {
        if (!this.#credential) {
            this.#credential = this.credentialProvider().catch(err => {
                this.#credential = undefined;
                throw err;
            });
        }
        return this.#credential;
    }

    private static generateNonce(): number {
        const arr = new Uint8Array(4);
        crypto.getRandomValues(arr);
        return Buffer.from(arr).readUint32BE();
    }

    private static deriveRequestKeypair(authCertPriv: Uint8Array): {
        secretKey: Buffer;
        publicKey: Buffer;
    } {
        const seed = hkdf(sha256, authCertPriv, new Uint8Array(), utf8(SEED_INFO), 32);
        const keys = ed25519.keygen(seed);
        return {
            secretKey: Buffer.from(keys.secretKey),
            publicKey: Buffer.from(keys.publicKey)
        };
    }
}
