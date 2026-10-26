export function encodeFlameMemo(memo: string): Uint8Array {
    return Uint8Array.from(Buffer.from(memo, 'utf8'));
}

export function clampFlameMemo(memo: string): string {
    const maxBytes = globalThis.flameSdk.memoMaxBytes();
    if (Buffer.byteLength(memo, 'utf8') <= maxBytes) {
        return memo;
    }

    let clamped = '';
    let bytes = 0;
    for (const codePoint of memo) {
        bytes += Buffer.byteLength(codePoint, 'utf8');
        if (bytes > maxBytes) break;
        clamped += codePoint;
    }
    return clamped;
}
