import type { KeychainErrorCode } from '../../shared/ipc';

export class KeychainError extends Error {
    constructor(
        public readonly code: KeychainErrorCode,
        options?: ErrorOptions
    ) {
        super(code, options);

        this.name = 'KeychainError';
    }
}
