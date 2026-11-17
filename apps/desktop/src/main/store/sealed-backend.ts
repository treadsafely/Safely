import fs from 'node:fs/promises';
import path from 'node:path';

import type { Logger } from '@safely/sync';

import { JsonStore } from './json-store';
import { SealedCodec } from './sealed-codec';
import { SealedKeySession } from './sealed-key-session';
import type { SecretBackend, SecretScope } from './types';
import type { UnlockOutcome } from '../../shared/ipc';
import type { WindowsHello } from '../plugins/hello';

const HEADER_FILE = 'sealed-key.json';

const SCOPE_FILE: Record<SecretScope, string> = {
    encrypted: 'sealed-encrypted.json',
    secureEncrypted: 'sealed-secure-encrypted.json'
};

export class SealedBackend implements SecretBackend {
    public readonly encrypted: JsonStore;

    public readonly secureEncrypted: JsonStore;

    private readonly session: SealedKeySession;

    private readonly headerPath: string;

    constructor(
        private readonly hello: WindowsHello,
        directory: string,
        logger: Logger
    ) {
        this.headerPath = path.join(directory, HEADER_FILE);

        const scopePaths: Record<SecretScope, string> = {
            encrypted: path.join(directory, SCOPE_FILE.encrypted),
            secureEncrypted: path.join(directory, SCOPE_FILE.secureEncrypted)
        };

        this.session = new SealedKeySession(
            hello,
            this.headerPath,
            Object.values(scopePaths),
            logger
        );
        this.encrypted = new JsonStore(
            scopePaths.encrypted,
            new SealedCodec(this.session, 'encrypted')
        );
        this.secureEncrypted = new JsonStore(
            scopePaths.secureEncrypted,
            new SealedCodec(this.session, 'secureEncrypted')
        );
    }

    public unlock(windowHandle: Buffer | null): Promise<UnlockOutcome> {
        return this.session.unlock(windowHandle);
    }

    public async erase(): Promise<void> {
        this.session.reset();

        const credentialName = await this.session.credentialName();

        await Promise.all([this.encrypted.erase(), this.secureEncrypted.erase()]);
        await fs.rm(this.headerPath, { force: true });

        if (credentialName !== null) {
            await this.session.discardCredential(credentialName);
        }
    }

    public isPresenceCheckAvailable(): Promise<boolean> {
        return this.hello.isSupported();
    }

    public verifyPresence(windowHandle: Buffer | null, message: string): Promise<boolean> {
        return this.hello.verifyPresence(windowHandle, message);
    }
}
