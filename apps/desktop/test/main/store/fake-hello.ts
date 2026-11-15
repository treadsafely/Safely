import { createHash } from 'node:crypto';

import type {
    HelloCredentialMode,
    HelloSignResult,
    WindowsHello
} from '../../../src/main/plugins/hello';

export type FakeHelloAnswer = Exclude<HelloSignResult['status'], 'signed'>;

export interface FakeHello extends WindowsHello {
    readonly credentials: Set<string>;
    readonly signCalls: Array<{ credentialName: string; mode: HelloCredentialMode }>;
    answerWith(answer: FakeHelloAnswer | null): void;
    setSupported(isSupported: boolean): void;
    rotateKey(): void;
}

/* a deterministic "signature": the same credential and challenge always sign to the same bytes */
export function createFakeHello(): FakeHello {
    const credentials = new Set<string>();
    const signCalls: FakeHello['signCalls'] = [];

    let answer: FakeHelloAnswer | null = null;
    let isSupported = true;
    let keyGeneration = 0;

    return {
        credentials,
        signCalls,

        answerWith: next => {
            answer = next;
        },

        setSupported: value => {
            isSupported = value;
        },

        rotateKey: () => {
            keyGeneration += 1;
        },

        isSupported: () => Promise.resolve(isSupported),

        /* a create leaves the credential behind before the scripted answer applies, as the platform does */
        sign: (credentialName, mode, challenge) => {
            signCalls.push({ credentialName, mode });

            if (mode === 'open' && !credentials.has(credentialName)) {
                return Promise.resolve({ status: 'notFound' });
            }

            if (mode === 'create' && credentials.has(credentialName)) {
                return Promise.resolve({ status: 'failed' });
            }

            credentials.add(credentialName);

            if (answer !== null) {
                return Promise.resolve({ status: answer });
            }

            const signature = createHash('sha256')
                .update(`${credentialName}:${keyGeneration}:`)
                .update(challenge)
                .digest();

            return Promise.resolve({
                status: 'signed',
                signature: Buffer.concat([signature, signature])
            });
        },

        verifyPresence: () => Promise.resolve(true),

        deleteCredential: credentialName => {
            credentials.delete(credentialName);

            return Promise.resolve();
        }
    };
}
