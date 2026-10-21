export function ellipsisMiddle(string: string, sideChars?: number): string;
export function ellipsisMiddle(string: undefined, sideChar?: number): undefined;
export function ellipsisMiddle(string: string | undefined, sideChars = 4) {
    if (!string) {
        return;
    }
    if (string.length <= sideChars * 2) {
        return string;
    }
    return string.slice(0, sideChars) + '…' + string.slice(-sideChars);
}

export function splitInHalf(string: string): [string, string] {
    const half = Math.ceil(string.length / 2);

    return [string.slice(0, half), string.slice(half)];
}

export enum SPACE {
    /** Non-Breaking Space — regular-width space that prevents a line break at this position. */
    NBSP = '\u00A0',
    /** Narrow No-Break Space; used as a digit group separator and before units. */
    NNBSP = '\u202F',
    /** Thin Space — thin typographic space (~1/5 em); used for fine spacing, line break allowed. */
    THSP = '\u2009',
    /** Figure Space — space with the width of a digit (tabular); aligns numbers in columns. */
    FSP = '\u2007'
}

// String.localeCompare may produce inconsistent results across different browsers and environments.
// `<` and `>` JavaScript operators compare UTF-16 endpoints without locale-specific rules, so this
// function should be consistent between different implementations.
export function compareStrings(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}
