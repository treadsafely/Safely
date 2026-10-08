import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LogFileStore } from '../../../src/main/logs/log-file-store';

const shell = vi.hoisted(() => ({ showItemInFolder: vi.fn(), openPath: vi.fn(async () => '') }));

vi.mock('electron', () => ({ shell }));

const DAY_MS = 24 * 60 * 60 * 1000;
const TODAY = new Date('2026-10-05T12:00:00.000Z');

describe('LogFileStore', () => {
    let directory: string;

    beforeEach(async () => {
        vi.useFakeTimers({ now: TODAY });
        directory = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'safely-logs-')), 'logs');
    });

    afterEach(async () => {
        vi.useRealTimers();
        await fs.rm(path.dirname(directory), { recursive: true, force: true });
    });

    it('appends to the file of the current day and reads the lines back', async () => {
        const files = new LogFileStore(directory);

        files.append(['{"a":1}', '{"a":2}']);
        files.append(['{"a":3}']);

        await expect(fs.readdir(directory)).resolves.toEqual(['safely-2026-10-05.ndjson']);
        await expect(files.read()).resolves.toEqual(['{"a":1}', '{"a":2}', '{"a":3}']);
    });

    it('drops files older than the retention window on cleanup', async () => {
        const files = new LogFileStore(directory);

        vi.setSystemTime(new Date(TODAY.getTime() - 8 * DAY_MS));
        files.append(['old']);
        vi.setSystemTime(new Date(TODAY.getTime() - 6 * DAY_MS));
        files.append(['kept']);
        vi.setSystemTime(TODAY);

        files.cleanup();

        await expect(files.read()).resolves.toEqual(['kept']);
    });

    it('drops the oldest files first when the set is over budget', async () => {
        const files = new LogFileStore(directory);
        const big = 'x'.repeat(1024 * 1024);

        vi.setSystemTime(new Date(TODAY.getTime() - 2 * DAY_MS));
        files.append([big]);
        vi.setSystemTime(new Date(TODAY.getTime() - DAY_MS));
        files.append([big]);
        vi.setSystemTime(TODAY);
        files.append(['latest']);

        await expect(fs.readdir(directory)).resolves.toEqual([
            'safely-2026-10-04.ndjson',
            'safely-2026-10-05.ndjson'
        ]);
    });

    it('erases every log file', async () => {
        const files = new LogFileStore(directory);

        files.append(['gone']);
        await files.erase();

        await expect(files.read()).resolves.toEqual([]);
    });

    it('reveals the newest file, or the directory when there is none', async () => {
        const files = new LogFileStore(directory);

        await files.share();
        expect(shell.openPath).toHaveBeenCalledWith(directory);

        files.append(['one']);
        await files.share();
        expect(shell.showItemInFolder).toHaveBeenCalledWith(
            path.join(directory, 'safely-2026-10-05.ndjson')
        );
    });

    it('reads an empty set when the directory does not exist yet', async () => {
        await expect(new LogFileStore(directory).read()).resolves.toEqual([]);
    });
});
