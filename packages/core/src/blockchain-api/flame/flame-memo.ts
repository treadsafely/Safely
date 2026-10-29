export function encodeFlameMemo(memo: string): Uint8Array {
    return Uint8Array.from(Buffer.from(memo, 'utf8'));
}

export function isFlameMemoWithinLimit(memo: string): boolean {
    return Buffer.byteLength(memo, 'utf8') <= globalThis.flameSdk.memoMaxBytes();
}
