const DEFAULT_MAX_DEPTH = 8;
const DEFAULT_MAX_LENGTH = 16 * 1024;

export type SafeStringifyOptions = {
    maxDepth?: number;
    maxLength?: number;
};

export function safeStringify(value: unknown, options?: SafeStringifyOptions): string {
    const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
    const maxLength = options?.maxLength ?? DEFAULT_MAX_LENGTH;
    const seen = new WeakSet<object>();

    const limit = (input: unknown, depth: number): unknown => {
        if (typeof input === 'bigint') {
            return `${input}`;
        }

        if (input === null || typeof input !== 'object') {
            return input;
        }

        const candidate =
            typeof (input as { toJSON?: unknown }).toJSON === 'function'
                ? (input as { toJSON: () => unknown }).toJSON()
                : input;

        if (candidate === null || typeof candidate !== 'object') {
            return candidate;
        }

        if (depth >= maxDepth) {
            return Array.isArray(candidate) ? '[Array]' : '[Object]';
        }

        if (seen.has(candidate)) {
            return '[Circular]';
        }

        seen.add(candidate);
        const result = Array.isArray(candidate)
            ? candidate.map(item => limit(item, depth + 1))
            : Object.fromEntries(
                  Object.entries(candidate).map(([key, item]) => [key, limit(item, depth + 1)])
              );
        seen.delete(candidate);

        return result;
    };

    let json: string;
    try {
        json = JSON.stringify(limit(value, 0)) ?? String(value);
    } catch {
        return String(value);
    }

    return json.length > maxLength ? JSON.stringify(`[truncated: ${json.length} bytes]`) : json;
}
