export interface ILogFileWriter {
    append(lines: string[]): void;
}
