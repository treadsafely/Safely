// The library seals the memo into the recipient's note and rejects anything longer
export const FLAME_MEMO_MAX_BYTES = 8102;

export function encodeFlameMemo(memo: string): Uint8Array {
    return Uint8Array.from(Buffer.from(memo, 'utf8'));
}

export function clampFlameMemo(memo: string): string {
    if (Buffer.byteLength(memo, 'utf8') <= FLAME_MEMO_MAX_BYTES) {
        return memo;
    }

    let clamped = '';
    let bytes = 0;
    for (const codePoint of memo) {
        bytes += Buffer.byteLength(codePoint, 'utf8');
        if (bytes > FLAME_MEMO_MAX_BYTES) break;
        clamped += codePoint;
    }
    return clamped;
}
