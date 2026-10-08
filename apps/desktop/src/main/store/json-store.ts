import fs from 'node:fs/promises';

import type { Store } from './types';
import { writeFileAtomic } from '../utils/atomic-file';

/**
 * A flat key/value file written **through** on every mutation: a `set` does not resolve until
 * the bytes are on disk. Nothing is buffered and there is no flush to forget — losing a
 * wallet's last write is worse than paying for the write. The price is a full rewrite per
 * mutation; if the data outgrows that, the way out is an embedded store with a write-ahead
 * log, not a buffer.
 *
 * Plaintext: the scopes that hold secrets are keychain items instead (`keychain-store.ts`).
 */
export class JsonStore implements Store {
    /** Read cache only — committed after the file write, so it cannot outrun the disk. */
    private data: Map<string, string> | null = null;

    /** Mutations are serialised: two concurrent read-modify-writes would lose an update. */
    private queue: Promise<unknown> = Promise.resolve();

    constructor(private readonly filePath: string) {}

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

    private async load(): Promise<Map<string, string>> {
        if (this.data) {
            return this.data;
        }

        return this.serialise(async () => {
            if (this.data) {
                return this.data;
            }

            this.data = await readStore(this.filePath);

            return this.data;
        });
    }

    private async mutate(apply: (data: Map<string, string>) => void): Promise<void> {
        await this.serialise(async () => {
            const current = this.data ?? (await readStore(this.filePath));
            const next = new Map(current);

            apply(next);

            await writeStore(this.filePath, next);

            this.data = next;
        });
    }

    private serialise<T>(operation: () => Promise<T>): Promise<T> {
        const result = this.queue.then(operation, operation);

        this.queue = result.catch(() => undefined);

        return result;
    }
}

async function readStore(filePath: string): Promise<Map<string, string>> {
    let raw: string;

    try {
        raw = await fs.readFile(filePath, 'utf8');
    } catch {
        /* first run: an absent file is an empty store */
        return new Map();
    }

    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null) {
        throw new Error(`Store file ${filePath} is not an object`);
    }

    return new Map(
        Object.entries(parsed).filter((entry): entry is [string, string] => {
            return typeof entry[1] === 'string';
        })
    );
}

async function writeStore(filePath: string, data: Map<string, string>): Promise<void> {
    await writeFileAtomic(filePath, JSON.stringify(Object.fromEntries(data)));
}
