import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import { z } from 'zod';

import type { Logger } from '@safely/sync';

import { KeychainError } from './keychain-error';
import type { UnlockOutcome } from '../../shared/ipc';
import type { HelloSignResult, WindowsHello } from '../plugins/hello';
import { writeFileAtomic } from '../utils/atomic-file';
import { isMissingFile } from '../utils/missing-file';

const HEADER_VERSION = 1;
const KEY_INFO = 'safely-desktop-hello-v1';
const DATA_KEY_LENGTH = 32;
const CHALLENGE_LENGTH = 32;
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;
const CREDENTIAL_PREFIX = 'com.safely.wallet-desktop.';

const sHeader = z.object({
    version: z.literal(HEADER_VERSION),
    installId: z.string().regex(/^[0-9a-f]{32}$/),
    challenge: z.string().min(1),
    wrappedDataKey: z.string().min(1)
});

type Header = z.infer<typeof sHeader>;
type HeaderDraft = Omit<Header, 'wrappedDataKey'>;

type HeaderRead = { kind: 'absent' } | { kind: 'unreadable' } | { kind: 'present'; header: Header };

export const credentialNameOf = (installId: string): string => CREDENTIAL_PREFIX + installId;

/* the data key of both sealed scopes: unwrapped once per launch, held until quit — see .claude/rules/desktop-secret-store-windows.md */
export class SealedKeySession {
    private key: Buffer | null = null;

    private pending: Promise<UnlockOutcome> | null = null;

    constructor(
        private readonly hello: WindowsHello,
        private readonly headerPath: string,
        private readonly scopePaths: readonly string[],
        private readonly logger: Logger
    ) {}

    public dataKey(): Buffer {
        if (!this.key) {
            throw new KeychainError('UNAVAILABLE');
        }

        return this.key;
    }

    /* single-flight: a reload or a second retry while the prompt is up must not raise another */
    public unlock(windowHandle: Buffer | null): Promise<UnlockOutcome> {
        if (this.key) {
            return Promise.resolve({ state: 'unlocked', isPresenceVerified: false });
        }

        if (!this.pending) {
            this.pending = this.unlockOnce(windowHandle)
                .catch((error: unknown): UnlockOutcome => {
                    this.logger.error('the sealed store could not be unlocked', error);

                    return { state: 'failed' };
                })
                .finally(() => {
                    this.pending = null;
                });
        }

        return this.pending;
    }

    public reset(): void {
        this.key?.fill(0);
        this.key = null;
    }

    public async credentialName(): Promise<string | null> {
        const read = await this.readHeader();

        return read.kind === 'present' ? credentialNameOf(read.header.installId) : null;
    }

    /* best-effort: an orphaned credential is harmless, it only piles up in the NGC container */
    public async discardCredential(credentialName: string): Promise<void> {
        try {
            await this.hello.deleteCredential(credentialName);
        } catch (error) {
            this.logger.warn('the Windows Hello credential was not deleted', error);
        }
    }

    private async unlockOnce(windowHandle: Buffer | null): Promise<UnlockOutcome> {
        const read = await this.readHeader();

        if (read.kind === 'unreadable') {
            this.logger.warn('the sealed store header cannot be read');

            return { state: 'lost' };
        }

        if (read.kind === 'absent' && (await this.hasScopeData())) {
            this.logger.warn('the sealed store header is missing while the scope files exist');

            return { state: 'lost' };
        }

        if (!(await this.hello.isSupported())) {
            return { state: 'unsupported' };
        }

        if (read.kind === 'present') {
            return this.open(read.header, windowHandle);
        }

        return this.create(windowHandle);
    }

    private async open(header: Header, windowHandle: Buffer | null): Promise<UnlockOutcome> {
        const signed = await this.hello.sign(
            credentialNameOf(header.installId),
            'open',
            Buffer.from(header.challenge, 'base64'),
            windowHandle
        );

        if (signed.status !== 'signed') {
            return { state: outcomeOf(signed.status, 'present') };
        }

        const wrappingKey = deriveWrappingKey(signed.signature, header);

        try {
            const key = unwrap(wrappingKey, header);

            if (!key) {
                this.logger.warn('the sealed store header does not open with this signature');

                return { state: 'mismatch' };
            }

            this.key = key;
        } finally {
            wrappingKey.fill(0);
            signed.signature.fill(0);
        }

        return { state: 'unlocked', isPresenceVerified: true };
    }

    /* a first launch that stops after the credential exists deletes it, or every retry leaves one behind */
    private async create(windowHandle: Buffer | null): Promise<UnlockOutcome> {
        const draft: HeaderDraft = {
            version: HEADER_VERSION,
            installId: randomBytes(16).toString('hex'),
            challenge: randomBytes(CHALLENGE_LENGTH).toString('base64')
        };
        const credentialName = credentialNameOf(draft.installId);

        try {
            const signed = await this.hello.sign(
                credentialName,
                'create',
                Buffer.from(draft.challenge, 'base64'),
                windowHandle
            );

            if (signed.status !== 'signed') {
                await this.discardCredential(credentialName);

                return { state: outcomeOf(signed.status, 'absent') };
            }

            const wrappingKey = deriveWrappingKey(signed.signature, draft);

            try {
                const key = randomBytes(DATA_KEY_LENGTH);
                const header: Header = { ...draft, wrappedDataKey: wrap(wrappingKey, draft, key) };

                await writeFileAtomic(this.headerPath, JSON.stringify(header));

                this.key = key;
            } finally {
                wrappingKey.fill(0);
                signed.signature.fill(0);
            }
        } catch (error) {
            await this.discardCredential(credentialName);

            throw error;
        }

        return { state: 'unlocked', isPresenceVerified: true };
    }

    /* an absent header is a first run or a loss, decided by the scope files; a header that is there but not ours is a loss */
    private async readHeader(): Promise<HeaderRead> {
        let raw: string;

        try {
            raw = await fs.readFile(this.headerPath, 'utf8');
        } catch (error) {
            if (isMissingFile(error)) {
                return { kind: 'absent' };
            }

            throw error;
        }

        try {
            return { kind: 'present', header: sHeader.parse(JSON.parse(raw)) };
        } catch {
            return { kind: 'unreadable' };
        }
    }

    /* a stat failure that is not an absent file must surface, or a new header goes over data */
    private async hasScopeData(): Promise<boolean> {
        for (const scopePath of this.scopePaths) {
            try {
                if ((await fs.stat(scopePath)).size > 0) {
                    return true;
                }
            } catch (error) {
                if (!isMissingFile(error)) {
                    throw error;
                }
            }
        }

        return false;
    }
}

function outcomeOf(
    status: Exclude<HelloSignResult['status'], 'signed'>,
    headerKind: HeaderRead['kind']
): Exclude<UnlockOutcome['state'], 'unlocked'> {
    if (status === 'notFound') {
        return headerKind === 'present' ? 'lost' : 'failed';
    }

    return status;
}

function deriveWrappingKey(signature: Buffer, draft: HeaderDraft): Buffer {
    return Buffer.from(
        hkdfSync(
            'sha256',
            signature,
            Buffer.from(draft.challenge, 'base64'),
            KEY_INFO,
            DATA_KEY_LENGTH
        )
    );
}

const associatedData = (draft: HeaderDraft): Buffer =>
    Buffer.from(`${draft.version}\u0000${draft.installId}\u0000${draft.challenge}`, 'utf8');

function wrap(wrappingKey: Buffer, draft: HeaderDraft, key: Buffer): string {
    const nonce = randomBytes(NONCE_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', wrappingKey, nonce);

    cipher.setAAD(associatedData(draft));

    const ciphertext = Buffer.concat([cipher.update(key), cipher.final()]);

    return Buffer.concat([nonce, ciphertext, cipher.getAuthTag()]).toString('base64');
}

function unwrap(wrappingKey: Buffer, header: Header): Buffer | null {
    const blob = Buffer.from(header.wrappedDataKey, 'base64');

    if (blob.length !== NONCE_LENGTH + DATA_KEY_LENGTH + TAG_LENGTH) {
        return null;
    }

    const decipher = createDecipheriv('aes-256-gcm', wrappingKey, blob.subarray(0, NONCE_LENGTH));

    decipher.setAAD(associatedData(header));
    decipher.setAuthTag(blob.subarray(blob.length - TAG_LENGTH));

    try {
        return Buffer.concat([
            decipher.update(blob.subarray(NONCE_LENGTH, blob.length - TAG_LENGTH)),
            decipher.final()
        ]);
    } catch {
        return null;
    }
}
