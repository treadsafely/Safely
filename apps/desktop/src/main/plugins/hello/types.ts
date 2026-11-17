export type HelloCredentialMode = 'create' | 'open';

export type HelloSignResult =
    | { status: 'signed'; signature: Buffer }
    | { status: 'unsupported' | 'cancelled' | 'notFound' | 'failed' };

export interface WindowsHello {
    isSupported(): Promise<boolean>;
    sign(
        credentialName: string,
        mode: HelloCredentialMode,
        challenge: Buffer,
        windowHandle: Buffer | null
    ): Promise<HelloSignResult>;
    verifyPresence(windowHandle: Buffer | null, message: string): Promise<boolean>;
    deleteCredential(credentialName: string): Promise<void>;
}
