export type RecoveryPhraseWord = { index: number; word: string };

const COLUMNS_COUNT = 3;

export function toRecoveryPhraseRows(mnemonic: string[]): RecoveryPhraseWord[][] {
    const rowsCount = Math.ceil(mnemonic.length / COLUMNS_COUNT);

    return Array.from({ length: rowsCount }, (_row, rowIndex) =>
        Array.from({ length: COLUMNS_COUNT }, (_column, columnIndex) => {
            const index = columnIndex * rowsCount + rowIndex;

            return { index, word: mnemonic[index] ?? '' };
        }).filter(entry => entry.index < mnemonic.length)
    );
}
