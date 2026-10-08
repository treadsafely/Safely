import { shell } from 'electron';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import type { ILogFileWriter } from '@safely/sync';

const FILE_PREFIX = 'safely-';
const FILE_EXTENSION = '.ndjson';
const DAY_FILE_PATTERN = /^safely-\d{4}-\d{2}-\d{2}\.ndjson$/;
const RETENTION_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TOTAL_SIZE_BYTES = 2 * 1024 * 1024;

type LogFile = { name: string; size: number };

export class LogFileStore implements ILogFileWriter {
    constructor(private readonly directory: string) {}

    public append(lines: string[]): void {
        if (lines.length === 0) return;

        try {
            fs.mkdirSync(this.directory, { recursive: true });
            fs.appendFileSync(this.pathOf(dayFileName(new Date())), lines.join('\n') + '\n', {
                mode: 0o600
            });
            this.enforceSizeBudget();
        } catch {
            /* the console transport still has the record; a failing disk must not take the app down */
        }
    }

    public async read(): Promise<string[]> {
        this.cleanup();

        const lines: string[] = [];

        for (const file of this.listLogFiles()) {
            try {
                const content = await fsp.readFile(this.pathOf(file.name), 'utf8');
                lines.push(...content.split('\n').filter(line => line.length > 0));
            } catch {
                /* a file deleted between the listing and the read is not an error worth a record */
            }
        }

        return lines;
    }

    public async erase(): Promise<void> {
        await Promise.all(
            this.listLogFiles().map(file => fsp.rm(this.pathOf(file.name), { force: true }))
        );
    }

    public async share(): Promise<void> {
        this.cleanup();
        await fsp.mkdir(this.directory, { recursive: true });

        const [latest] = this.listLogFiles().slice(-1);

        if (latest) {
            shell.showItemInFolder(this.pathOf(latest.name));
            return;
        }

        const failure = await shell.openPath(this.directory);

        if (failure) {
            throw new Error(failure);
        }
    }

    public cleanup(): void {
        const oldestAllowedName = dayFileName(new Date(Date.now() - (RETENTION_DAYS - 1) * DAY_MS));

        for (const file of this.listLogFiles()) {
            if (file.name < oldestAllowedName) {
                this.deleteQuietly(file.name);
            }
        }
    }

    private enforceSizeBudget(): void {
        const files = this.listLogFiles();
        let total = files.reduce((sum, file) => sum + file.size, 0);

        for (const file of files) {
            if (total <= MAX_TOTAL_SIZE_BYTES) return;

            total -= file.size;
            this.deleteQuietly(file.name);
        }
    }

    private listLogFiles(): LogFile[] {
        let names: string[];

        try {
            names = fs.readdirSync(this.directory);
        } catch {
            return [];
        }

        return names
            .filter(name => DAY_FILE_PATTERN.test(name))
            .sort()
            .flatMap(name => {
                try {
                    return [{ name, size: fs.statSync(this.pathOf(name)).size }];
                } catch {
                    return [];
                }
            });
    }

    private deleteQuietly(name: string): void {
        try {
            fs.rmSync(this.pathOf(name), { force: true });
        } catch {
            /* a file already gone is the outcome wanted */
        }
    }

    private pathOf(name: string): string {
        return path.join(this.directory, name);
    }
}

function dayFileName(date: Date): string {
    return `${FILE_PREFIX}${date.toISOString().slice(0, 10)}${FILE_EXTENSION}`;
}
