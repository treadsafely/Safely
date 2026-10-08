import { vi } from 'vitest';

import type { ITreeStorage } from '@safely/sync';

import type { TranslateFn } from '../../src/shared/i18n/types';
import type { IAppContext } from '../../src/shared/providers/AppContext';

export class InMemoryTreeStorage implements ITreeStorage {
    public map: Map<string, string>;

    constructor(
        private readonly prefix: string[] = [],
        backing?: Map<string, string>
    ) {
        this.map = backing ?? new Map<string, string>();
    }

    private key(k: string) {
        return [...this.prefix, k].join('..');
    }

    public async getItem(key: string): Promise<string | null> {
        return this.map.get(this.key(key)) ?? null;
    }

    public async setItem(key: string, value: string): Promise<void> {
        this.map.set(this.key(key), value);
    }

    public async removeItem(key: string): Promise<void> {
        this.map.delete(this.key(key));
    }

    public async clear(): Promise<void> {
        const prefix = this.prefix.length > 0 ? this.prefix.join('..') + '..' : '';
        for (const k of [...this.map.keys()]) {
            if (!prefix || k.startsWith(prefix)) {
                this.map.delete(k);
            }
        }
    }

    public async getOwnKeys(): Promise<string[]> {
        const prefix = this.prefix.length > 0 ? this.prefix.join('..') + '..' : '';
        return [...this.map.keys()]
            .filter(k => (prefix ? k.startsWith(prefix) : true))
            .map(k => (prefix ? k.slice(prefix.length) : k))
            .filter(k => !k.includes('..'));
    }

    public child(name: string | string[]): ITreeStorage {
        const next = Array.isArray(name) ? name : [name];
        return new InMemoryTreeStorage([...this.prefix, ...next], this.map);
    }
}

export function createTestTranslate(): TranslateFn {
    return ((key: string, values?: Record<string, unknown>) => {
        if (!values) return key;
        return `${key}:${JSON.stringify(values)}`;
    }) as TranslateFn;
}

export type CreateTestAppContextOptions = Partial<IAppContext> & {
    securityCheck?: ReturnType<typeof vi.fn>;
    toastShow?: ReturnType<typeof vi.fn>;
    clearAllData?: () => Promise<void>;
    reloadApp?: () => void;
    qrScan?: ReturnType<typeof vi.fn>;
    deviceName?: string;
};

export function createTestAppContext(opts: CreateTestAppContextOptions = {}): IAppContext {
    const rootUxStorage = new InMemoryTreeStorage(['ux']);
    const rootSyncRegular = new InMemoryTreeStorage(['sync', 'regular']);
    const rootSyncEncrypted = new InMemoryTreeStorage(['sync', 'encrypted']);

    const securityCheck = opts.securityCheck ?? vi.fn(async () => undefined);
    const toastShow = opts.toastShow ?? vi.fn();
    const qrScan = opts.qrScan ?? vi.fn();

    const secureEncryptedStub = {
        isLocked: false,
        unlock: vi.fn(async () => undefined),
        UNSAFE_SKIP_SECURITY_CHECK_unlock: vi.fn(),
        getItem: vi.fn(async () => null),
        setItem: vi.fn(async () => undefined),
        removeItem: vi.fn(async () => undefined),
        clear: vi.fn(async () => undefined),
        getOwnKeys: vi.fn(async () => []),
        child: vi.fn(),
        [Symbol.dispose]: vi.fn()
    };

    const ctx = {
        version: '0.0.0-test',
        build: 'ios',
        deviceInfo: {
            name: opts.deviceName ?? 'TEST_DEVICE',
            osVersion: '0.0.0'
        },
        getUserCountryInfo: async () => ({ storeCode: 'US', deviceCode: 'US' }),
        devToken: undefined,
        storage: {
            ux: { regular: rootUxStorage },
            sync: {
                regular: rootSyncRegular,
                encrypted: rootSyncEncrypted,
                getSecureEncrypted: () => secureEncryptedStub
            }
        },
        qrScanner: {
            scan: qrScan
        },
        pushNotifications: {
            getPermissionStatus: async () => 'undetermined',
            requestPermission: async () => 'undetermined',
            getPushToken: async () => 'ExponentPushToken[test]',
            openSystemSettings: () => undefined,
            setWalletNames: async () => undefined
        },
        numberFormatLocale: {
            decimalSeparator: '.',
            groupSeparator: ',',
            primaryGroupSize: 3,
            secondaryGroupSize: 3,
            getCurrencyAffixes: () => ({
                positive: { prefix: '', suffix: '' },
                negative: { prefix: '-', suffix: '' }
            }),
            getCurrencyFractionDigits: () => 2
        },
        toast: { show: toastShow },
        linking: {},
        loader: {
            withLoader: async <T,>(f: () => Promise<T> | T) => f()
        },
        i18n: {
            language: 'en',
            t: createTestTranslate()
        },
        clearAllData: opts.clearAllData ?? vi.fn(async () => undefined),
        reloadApp: opts.reloadApp ?? vi.fn(),
        logger: createNoopLogger(),
        security: { check: securityCheck },
        subscribeAppStateChange: () => () => undefined,
        ...opts
    } as unknown as IAppContext;

    return ctx;
}

function createNoopLogger() {
    const noop = vi.fn();
    const logger: unknown = {
        info: noop,
        warn: noop,
        error: noop,
        debug: noop,
        trace: noop,
        child: () => logger
    };
    return logger;
}
