import type { ILogFileWriter } from './I-log-file-writer';
import type { LogRecord } from './log-record';

export interface ILogFileStore extends ILogFileWriter {
    read(): Promise<LogRecord[]>;
    erase(): Promise<void>;
    share(): Promise<void>;
}
