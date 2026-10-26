export class SecurityCheckCancelledError extends Error {
    constructor() {
        super('Security check cancelled');

        this.name = 'SecurityCheckCancelledError';
    }
}
