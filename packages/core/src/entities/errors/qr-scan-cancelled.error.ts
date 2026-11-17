export class QrScanCancelledError extends Error {
    constructor() {
        super('QR scan cancelled');

        this.name = 'QrScanCancelledError';
    }
}
