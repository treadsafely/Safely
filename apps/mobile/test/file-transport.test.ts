import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LogLevel } from '@safely/sync';

const files = new Map<string, string>();
const shared: string[] = [];

vi.mock('expo-crypto', () => ({ randomUUID: () => 'random-token' }));

vi.mock('expo-sharing', () => ({
    shareAsync: (uri: string) => {
        shared.push(uri);

        return Promise.resolve();
    }
}));

vi.mock('expo-file-system', () => {
    class File {
        public readonly name: string;

        constructor(...parts: string[]) {
            this.name = parts[parts.length - 1];
        }

        public get uri() {
            return `file:///cache/${this.name}`;
        }

        public get exists() {
            return files.has(this.name);
        }

        public get size() {
            return files.get(this.name)?.length ?? 0;
        }

        public create() {
            files.set(this.name, '');
        }

        public write(content: string) {
            files.set(this.name, content);
        }

        public text() {
            return Promise.resolve(files.get(this.name) ?? '');
        }

        public delete() {
            files.delete(this.name);
        }

        public open() {
            const name = this.name;

            return {
                offset: 0,
                writeBytes(bytes: Uint8Array) {
                    files.set(name, (files.get(name) ?? '') + new TextDecoder().decode(bytes));
                },
                close() {}
            };
        }
    }

    class Directory {
        public list() {
            return [...files.keys()].map(name => new File(name));
        }
    }

    return { File, Directory, Paths: { cache: 'file:///cache' } };
});

const { FileTransport } = await import('@mobile/shared/logger/file-transport');

/** Fixed so the day file names below hold whenever the suite runs. */
const NOW = new Date('2026-03-04T12:00:00.000Z');
const TODAY = '2026-03-04';
const TODAY_FILE = `safely-${TODAY}.ndjson`;

const buildTransport = () =>
    new FileTransport({
        appVersion: '1.2.3',
        build: 'internal',
        deviceInfo: { name: 'iPhone', osVersion: '18.0' }
    });

const entry = (level: LogLevel, message: string, timestamp = NOW) => ({
    timestamp,
    level,
    path: ['test'],
    message: [message]
});

const dayFile = (day: string, message: string) =>
    JSON.stringify({
        t: `${day}T10:00:00.000Z`,
        l: LogLevel.ERROR,
        p: ['test'],
        m: message,
        v: '1.2.3',
        b: 'internal',
        d: 'iPhone, 18.0'
    }) + '\n';

describe('FileTransport', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
        files.clear();
        shared.length = 0;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should write errors into a file named after the current day', () => {
        buildTransport().log(entry(LogLevel.ERROR, 'boom'));

        expect([...files.keys()]).toEqual([TODAY_FILE]);
        expect(files.get(TODAY_FILE)).toContain('"m":"boom"');
    });

    it('should keep low severity records out of the file until an error flushes them', () => {
        const transport = buildTransport();

        transport.log(entry(LogLevel.INFO, 'context'));
        expect(files.size).toBe(0);

        transport.log(entry(LogLevel.ERROR, 'boom'));
        expect(files.get(TODAY_FILE)).toContain('"m":"context"');
    });

    it('should drop files older than the retention window on start', () => {
        files.set('safely-2026-02-26.ndjson', dayFile('2026-02-26', 'within window'));
        files.set('safely-2026-02-25.ndjson', dayFile('2026-02-25', 'expired'));

        buildTransport();

        expect([...files.keys()]).toEqual(['safely-2026-02-26.ndjson']);
    });

    it('should drop the legacy single log file and leftover share copies on start', () => {
        files.set('safely.ndjson', dayFile(TODAY, 'legacy'));
        files.set('safely-share-random-token.ndjson', dayFile(TODAY, 'leftover'));
        files.set('some-other-app-file.json', '{}');

        buildTransport();

        expect([...files.keys()]).toEqual(['some-other-app-file.json']);
    });

    it('should read records from every day file, oldest first', async () => {
        files.set('safely-2026-03-03.ndjson', dayFile('2026-03-03', 'older'));
        files.set(TODAY_FILE, dayFile(TODAY, 'newer'));

        const records = await buildTransport().read();

        expect(records.map(record => record.message)).toEqual(['older', 'newer']);
    });

    it('should share a throwaway copy instead of the log file itself', async () => {
        files.set(TODAY_FILE, dayFile(TODAY, 'boom'));

        await buildTransport().share();

        expect(shared).toEqual(['file:///cache/safely-share-random-token.ndjson']);
        expect(files.get('safely-share-random-token.ndjson')).toContain('"m":"boom"');
        expect(files.has(TODAY_FILE)).toBe(true);
    });

    it('should remove a previous share copy before sharing again', async () => {
        files.set(TODAY_FILE, dayFile(TODAY, 'boom'));
        const transport = buildTransport();

        await transport.share();
        await transport.share();

        expect([...files.keys()].filter(name => name.startsWith('safely-share-'))).toEqual([
            'safely-share-random-token.ndjson'
        ]);
    });

    it('should not share anything when there are no logs', async () => {
        await buildTransport().share();

        expect(shared).toEqual([]);
        expect(files.size).toBe(0);
    });

    it('should drop the oldest day files when the whole set is over budget', () => {
        files.set('safely-2026-03-02.ndjson', 'x'.repeat(1536 * 1024));
        files.set('safely-2026-03-03.ndjson', 'y'.repeat(1536 * 1024));

        buildTransport().log(entry(LogLevel.ERROR, 'boom'));

        expect([...files.keys()]).toEqual(['safely-2026-03-03.ndjson', TODAY_FILE]);
    });

    it('should erase its own files only', () => {
        files.set(TODAY_FILE, dayFile(TODAY, 'boom'));
        files.set('some-other-app-file.json', '{}');

        buildTransport().erase();

        expect([...files.keys()]).toEqual(['some-other-app-file.json']);
    });
});
