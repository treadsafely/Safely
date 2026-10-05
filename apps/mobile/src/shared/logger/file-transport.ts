import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';

import { compareStrings } from '@safely/core';
import type { ILoggerTransport, LogEntry } from '@safely/sync';
import { LogLevel } from '@safely/sync';

import { type StoredLog, sStoredLog } from './schemas/stored-log.schema';

const FILE_EXTENSION = '.ndjson';
const FILE_PREFIX = 'safely-';
/** Logs are split into one file per UTC day, so expired ones are dropped by deleting whole files. */
const DAY_FILE_PATTERN = /^safely-\d{4}-\d{2}-\d{2}\.ndjson$/;
/** Single log file used before per-day files were introduced. */
const LEGACY_FILE_NAME = 'safely.ndjson';
/** Prefix of the one-off copy handed to the share sheet, never of a live log file. */
const SHARE_FILE_PREFIX = `${FILE_PREFIX}share-`;
/** Today plus the previous six days. */
const RETENTION_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TOTAL_SIZE_BYTES = 2 * 1024 * 1024;
const CONTEXT_BUFFER_SIZE = 1000;

type FileTransportConfig = {
    appVersion: string;
    build: string;
    deviceInfo: { name: string; osVersion: string };
};

export type LogRecord = {
    timestamp: string;
    level: LogLevel;
    path: string[];
    message: string;
    appVersion: string;
    build: string;
    device: string;
};

export class FileTransport implements ILoggerTransport {
    private readonly appVersion: string;
    private readonly build: string;
    private readonly device: string;
    private context: string[] = [];

    constructor(opts: FileTransportConfig) {
        this.appVersion = opts.appVersion;
        this.build = opts.build;
        this.device = `${opts.deviceInfo.name}, ${opts.deviceInfo.osVersion}`;

        this.cleanup();
    }

    public log(entry: LogEntry): void {
        const serialized = this.serialize(entry);

        if (entry.level < LogLevel.WARN) {
            this.context.push(serialized);

            if (this.context.length > CONTEXT_BUFFER_SIZE) {
                this.context.shift();
            }

            return;
        }

        if (entry.level >= LogLevel.ERROR) {
            this.writeToFile([...this.context, serialized]);
            this.context = [];

            return;
        }

        this.writeToFile([serialized]);
    }

    public erase(): void {
        this.context = [];

        for (const file of this.listOwnFiles()) {
            this.deleteQuietly(file);
        }
    }

    /**
     * Shares a throwaway copy instead of the live log files: on Android
     * `expo-sharing` grants read access to the shared URI to every app able to
     * handle the intent, not only to the one the user picks, and never revokes
     * it — so the URI must not be a stable, guessable one. The copy is removed
     * by `cleanup()` on the next launch or share rather than right after the
     * share sheet closes, because some receivers (mail clients) read the URI
     * only while composing.
     */
    public async share(): Promise<void> {
        this.cleanup();

        const files = this.listLogFiles();
        if (files.length === 0) return;

        let snapshot: File;
        try {
            const content = (await Promise.all(files.map(file => file.text()))).join('');

            snapshot = new File(
                Paths.cache,
                `${SHARE_FILE_PREFIX}${randomUUID()}${FILE_EXTENSION}`
            );
            snapshot.create();
            snapshot.write(content);
        } catch (e) {
            console.error('[FileTransport] failed to prepare logs for sharing', e);

            return;
        }

        await shareAsync(snapshot.uri, {
            mimeType: 'application/x-ndjson',
            dialogTitle: 'Share Safely Logs'
        });
    }

    public async read(): Promise<LogRecord[]> {
        const records: LogRecord[] = [];

        for (const file of this.listLogFiles()) {
            try {
                const content = await file.text();

                for (const line of content.split('\n')) {
                    const record = this.parseLogLine(line);
                    if (record) records.push(record);
                }
            } catch (e) {
                console.error('[FileTransport] failed to read log file', e);
            }
        }

        return records;
    }

    /** Drops logs older than the retention window, plus leftover share copies. */
    private cleanup(): void {
        const oldestAllowedName = this.dayFileName(
            new Date(Date.now() - (RETENTION_DAYS - 1) * DAY_MS)
        );

        for (const file of this.listOwnFiles()) {
            const isExpired =
                DAY_FILE_PATTERN.test(file.name) &&
                compareStrings(file.name, oldestAllowedName) < 0;

            if (isExpired || file.name === LEGACY_FILE_NAME || this.isShareFile(file)) {
                this.deleteQuietly(file);
            }
        }
    }

    private writeToFile(lines: string[]): void {
        if (lines.length === 0) return;

        const content = lines.join('\n') + '\n';
        const logFile = new File(Paths.cache, this.dayFileName(new Date()));

        this.enforceSizeBudget();

        try {
            if (logFile.exists) {
                const handle = logFile.open();
                handle.offset = logFile.size;
                handle.writeBytes(new TextEncoder().encode(content));
                handle.close();
            } else {
                logFile.create();
                logFile.write(content);
            }
        } catch (e) {
            console.error('[FileTransport] failed to write logs', e);
        }
    }

    /**
     * Drops the oldest day files while the whole set is over budget. Files are
     * ordered oldest first, so today's file is dropped only once everything
     * older is gone and it still exceeds the budget on its own.
     */
    private enforceSizeBudget(): void {
        const files = this.listLogFiles();
        let total = files.reduce((sum, file) => sum + file.size, 0);

        for (const file of files) {
            if (total <= MAX_TOTAL_SIZE_BYTES) return;

            total -= file.size;
            this.deleteQuietly(file);
        }
    }

    private dayFileName(date: Date): string {
        return `${FILE_PREFIX}${date.toISOString().slice(0, 10)}${FILE_EXTENSION}`;
    }

    private isShareFile(file: File): boolean {
        return file.name.startsWith(SHARE_FILE_PREFIX);
    }

    /** Day files, oldest first — their names sort chronologically by construction. */
    private listLogFiles(): File[] {
        return this.listCacheFiles()
            .filter(file => DAY_FILE_PATTERN.test(file.name))
            .sort((a, b) => compareStrings(a.name, b.name));
    }

    private listOwnFiles(): File[] {
        return this.listCacheFiles().filter(
            file =>
                DAY_FILE_PATTERN.test(file.name) ||
                file.name === LEGACY_FILE_NAME ||
                this.isShareFile(file)
        );
    }

    private listCacheFiles(): File[] {
        try {
            return new Directory(Paths.cache)
                .list()
                .filter((entry): entry is File => entry instanceof File);
        } catch (e) {
            console.error('[FileTransport] failed to list the cache directory', e);

            return [];
        }
    }

    private deleteQuietly(file: File): void {
        try {
            if (file.exists) file.delete();
        } catch (e) {
            console.error('[FileTransport] failed to delete log file', e);
        }
    }

    private serialize(entry: LogEntry): string {
        const stored: StoredLog = {
            t: entry.timestamp.toISOString(),
            l: entry.level,
            p: entry.path,
            m: entry.message.map(message => this.serializeMessage(message)).join(' '),
            v: this.appVersion,
            b: this.build,
            d: this.device
        };

        return JSON.stringify(stored);
    }

    private parseLogLine(line: string): LogRecord | null {
        if (!line) return null;

        let parsed: unknown;
        try {
            parsed = JSON.parse(line);
        } catch {
            return null;
        }

        const result = sStoredLog.safeParse(parsed);
        if (!result.success) return null;

        const stored = result.data;

        return {
            timestamp: stored.t,
            level: stored.l,
            path: stored.p,
            message: stored.m,
            appVersion: stored.v,
            build: stored.b,
            device: stored.d
        };
    }

    private serializeMessage(message: unknown): string {
        if (typeof message === 'string') return message;
        if (message instanceof Error) return message.stack ?? message.message;

        try {
            return JSON.stringify(message);
        } catch {
            return String(message);
        }
    }
}
