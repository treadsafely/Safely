export interface SafelyCrypto {
    pbkdf2Sha512(
        password: Uint8Array,
        salt: Uint8Array,
        iterations: number,
        keyLength: number
    ): Promise<Uint8Array>;
}

declare global {
    var safelyCrypto: SafelyCrypto;
}
