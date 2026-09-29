export const BUSTER_VERSION = 'v1';

export const CACHE_LIVE_TIME = 1000 * 60 * 60 * 24 * 24; // 24 days

export const QUERIES_STALE_TIME = {
    ASSETS: 0,
    ACTIVITY: 1000 * 30,
    MAX_SEND: 1000 * 30,
    DEFAULT: 1000 * 60 * 5
};

export const QUERIES_REFETCH_INTERVAL = {
    DEFAULT: 1000 * 30,
    TRANSACTION: 1000 * 60,
    UTXO: 1000 * 5
};
