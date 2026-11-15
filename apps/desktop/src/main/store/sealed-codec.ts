import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import type { FileCodec } from './json-store';
import { plainJsonCodec } from './json-store';
import { KeychainError } from './keychain-error';
import type { SealedKeySession } from './sealed-key-session';
import type { SecretScope } from './types';

const FORMAT_VERSION = 1;
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;
const HEADER_LENGTH = 1 + NONCE_LENGTH;

export class SealedCodec implements FileCodec {
    constructor(
        private readonly session: SealedKeySession,
        private readonly scope: SecretScope
    ) {}

    public encode(data: Map<string, string>): string {
        const nonce = randomBytes(NONCE_LENGTH);
        const cipher = createCipheriv('aes-256-gcm', this.session.dataKey(), nonce);

        cipher.setAAD(this.associatedData());

        const ciphertext = Buffer.concat([
            cipher.update(plainJsonCodec.encode(data), 'utf8'),
            cipher.final()
        ]);

        return Buffer.concat([
            Buffer.from([FORMAT_VERSION]),
            nonce,
            ciphertext,
            cipher.getAuthTag()
        ]).toString('base64');
    }

    public decode(content: string): Map<string, string> {
        const key = this.session.dataKey();

        if (content === '') {
            return new Map();
        }

        const blob = Buffer.from(content, 'base64');

        if (blob.length < HEADER_LENGTH + TAG_LENGTH || blob[0] !== FORMAT_VERSION) {
            throw new KeychainError('CORRUPT');
        }

        const nonce = blob.subarray(1, HEADER_LENGTH);
        const ciphertext = blob.subarray(HEADER_LENGTH, blob.length - TAG_LENGTH);
        const tag = blob.subarray(blob.length - TAG_LENGTH);
        const decipher = createDecipheriv('aes-256-gcm', key, nonce);

        decipher.setAAD(this.associatedData());
        decipher.setAuthTag(tag);

        try {
            const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

            return plainJsonCodec.decode(plaintext.toString('utf8'));
        } catch (cause) {
            throw new KeychainError('CORRUPT', { cause });
        }
    }

    private associatedData(): Buffer {
        return Buffer.from(`${this.scope}\u0000${FORMAT_VERSION}`, 'utf8');
    }
}
