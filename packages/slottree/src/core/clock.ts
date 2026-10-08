/**
 * Source of wall-clock time used by SlotTree logical clocks.
 */
export interface Clock {
    /**
     * Returns the current Unix time in whole seconds.
     */
    nowSeconds(): number;
}

export const systemClock: Clock = {
    nowSeconds: () => Math.floor(Date.now() / 1000)
};
