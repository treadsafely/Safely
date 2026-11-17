import fs from 'node:fs/promises';

import type { Store } from './types';
import { writeFileAtomic } from '../utils/atomic-file';
import { isMissingFile } from '../utils/missing-file';

export interface FileCodec {
    encode(data: Map<string, string>): string;
    decode(content: string): Map<string, string>;
}

export const plainJsonCodec: FileCodec = {
    encode: data => JSON.stringify(Object.fromEntries(data)),
    decode: content => {
        if (content === '') {
            return new Map();
        }

        const parsed: unknown = JSON.parse(content);

        if (typeof parsed !== 'object' || parsed === null) {
            throw new Error('Store file is not an object');
        }

        return new Map(
            Object.entries(parsed).filter((entry): entry is [string, string] => {
                return typeof entry[1] === 'string';
            })
        );
    }
};

/**
 * A flat key/value file written **through** on every mutation: a `set` does not resolve until
 * the bytes are on disk. Nothing is buffered and there is no flush to forget — losing a
 * wallet's last write is worse than paying for the write. The price is a full rewrite per
 * mutation; if the data outgrows that, the way out is an embedded store with a write-ahead
 * log, not a buffer.
 *
 * The codec decides what the file holds: plaintext JSON for `regular`, one sealed blob per
 * scope for the secret scopes on Windows (`sealed-codec.ts`).
 */
export class JsonStore implements Store {
    /** Read cache only — committed after the file write, so it cannot outrun the disk. */
    private data: Map<string, string> | null = null;

    /** Mutations are serialised: two concurrent read-modify-writes would lose an update. */
    private queue: Promise<unknown> = Promise.resolve();

    constructor(
        private readonly filePath: string,
        private readonly codec: FileCodec = plainJsonCodec
    ) {}

    public async get(key: string): Promise<string | null> {
        const stored = (await this.load()).get(key);

        return stored === undefined ? null : stored;
    }

    public async set(key: string, value: string): Promise<void> {
        return this.mutate(data => data.set(key, value));
    }

    public async remove(key: string): Promise<void> {
        return this.mutate(data => data.delete(key));
    }

    public async clear(): Promise<void> {
        return this.mutate(data => data.clear());
    }

    public async keys(prefix: string): Promise<string[]> {
        const keys = [...(await this.load()).keys()];

        return prefix === '' ? keys : keys.filter(key => key.startsWith(prefix));
    }

    public async removeWithPrefix(prefix: string): Promise<void> {
        return this.mutate(data => {
            /* the IEnumerableStorage contract: an empty prefix behaves as clear() */
            if (prefix === '') {
                data.clear();
                return;
            }

            for (const key of [...data.keys()]) {
                if (key.startsWith(prefix)) {
                    data.delete(key);
                }
            }
        });
    }

    /* inside the queue: a write still pending must land before the file goes, not recreate it after */
    public erase(): Promise<void> {
        return this.serialise(async () => {
            await fs.rm(this.filePath, { force: true });
            this.data = null;
        });
    }

    private async load(): Promise<Map<string, string>> {
        if (this.data) {
            return this.data;
        }

        return this.serialise(async () => {
            if (this.data) {
                return this.data;
            }

            this.data = await readStore(this.filePath, this.codec);

            return this.data;
        });
    }

    private async mutate(apply: (data: Map<string, string>) => void): Promise<void> {
        await this.serialise(async () => {
            const current = this.data ?? (await readStore(this.filePath, this.codec));
            const next = new Map(current);

            apply(next);

            await writeFileAtomic(this.filePath, this.codec.encode(next));

            this.data = next;
        });
    }

    private serialise<T>(operation: () => Promise<T>): Promise<T> {
        const result = this.queue.then(operation, operation);

        this.queue = result.catch(() => undefined);

        return result;
    }
}

/* only an absent file is an empty store; any other read failure must surface, or the next write wipes the data */
async function readStore(filePath: string, codec: FileCodec): Promise<Map<string, string>> {
    let raw: string;

    try {
        raw = await fs.readFile(filePath, 'utf8');
    } catch (error) {
        if (isMissingFile(error)) {
            return codec.decode('');
        }

        throw error;
    }

    return codec.decode(raw);
}
