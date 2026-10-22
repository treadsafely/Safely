import { IEnumerableStorage, IStorage } from '@safely/sync';

export class InMemoryStorage implements IStorage {
    public readonly map = new Map<string, string>();

    public async setItem(key: string, value: string): Promise<void> {
        this.map.set(key, value);
    }

    public async getItem(key: string): Promise<string | null> {
        return this.map.has(key) ? (this.map.get(key) as string) : null;
    }

    public async removeItem(key: string): Promise<void> {
        this.map.delete(key);
    }

    public async clear(): Promise<void> {
        this.map.clear();
    }
}

export class InMemoryEnumerableStorage extends InMemoryStorage implements IEnumerableStorage {
    public async getAllKeys(): Promise<string[]> {
        return Array.from(this.map.keys());
    }

    public async getKeysWithPrefix(prefix: string): Promise<string[]> {
        return Array.from(this.map.keys()).filter(k => k.startsWith(prefix));
    }

    public async removeItemsWithPrefix(prefix: string): Promise<void> {
        for (const key of Array.from(this.map.keys())) {
            if (key.startsWith(prefix)) this.map.delete(key);
        }
    }
}
