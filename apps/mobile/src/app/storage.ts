import * as SecureStore from 'expo-secure-store';
import { createMMKV } from 'react-native-mmkv';

import type { IEnumerableStorage, ISyncKeyValueStorage, ISyncSingleStorage } from '@safely/core';
import { TreeStorage } from '@safely/core';

import { SafelySecureStoreEnum } from '../../modules/safely-secure-store-enum/src';

function createMMKVEnumerableStorage(id: string) {
    const mmkv = createMMKV({ id });
    const storage: IEnumerableStorage = {
        getItem: async (key: string) => mmkv.getString(key) ?? null,
        setItem: async (key: string, value: string) => mmkv.set(key, value),
        removeItem: async (key: string) => {
            mmkv.remove(key);
        },
        clear: async () => mmkv.clearAll(),
        getAllKeys: async () => mmkv.getAllKeys(),
        getKeysWithPrefix: async (prefix: string) =>
            mmkv.getAllKeys().filter(k => k.startsWith(prefix)),
        removeItemsWithPrefix: async (prefix: string) => {
            for (const key of mmkv.getAllKeys()) {
                if (key.startsWith(prefix)) mmkv.remove(key);
            }
        }
    };

    return {
        storage,
        mmkv
    };
}

function createMMKVTreeStorage(id: string) {
    const { storage: enumerableStorage, mmkv } = createMMKVEnumerableStorage(id);

    const storage = TreeStorage.root(enumerableStorage);

    return {
        storage,
        enumerable: enumerableStorage,
        mmkv
    };
}

function createMMKVSyncSingleStorage(id: string) {
    const mmkv = createMMKV({ id });
    const storage: ISyncSingleStorage = {
        get: () => mmkv.getString(id) ?? null,
        set: (value: string) => mmkv.set(id, value),
        clear: () => mmkv.remove(id)
    };

    return {
        storage,
        mmkv
    };
}

function createMMKVSyncKeyValueStorage(id: string) {
    const mmkv = createMMKV({ id });
    const storage: ISyncKeyValueStorage = {
        get: key => mmkv.getString(key) ?? null,
        set: (key, value) => mmkv.set(key, value),
        remove: key => mmkv.remove(key),
        clear: () => mmkv.clearAll()
    };

    return {
        storage,
        mmkv
    };
}

function createKeychainEnumerableStorage(
    keychainService: string,
    keychainAccessible: SecureStore.KeychainAccessibilityConstant
): IEnumerableStorage {
    const options = {
        keychainService,
        keychainAccessible,
        requireAuthentication: false
    } satisfies SecureStore.SecureStoreOptions;

    const clear = () => SafelySecureStoreEnum.clearAsync(options);
    return {
        getItem: key => SecureStore.getItemAsync(key, options),
        setItem: async (key, value) => {
            await SecureStore.setItemAsync(key, value, options);
        },
        removeItem: async key => {
            await SecureStore.deleteItemAsync(key, options);
        },
        clear,
        getAllKeys: () => SafelySecureStoreEnum.getKeysAsync(options),
        getKeysWithPrefix: prefix => SafelySecureStoreEnum.getKeysWithPrefixAsync(prefix, options),
        removeItemsWithPrefix: prefix =>
            // IEnumerableStorage contract: empty prefix must behave as clear()
            prefix === ''
                ? clear()
                : SafelySecureStoreEnum.removeItemsWithPrefixAsync(prefix, options)
    };
}

function createKeychainTreeStorage(
    keychainService: string,
    keychainAccessible: SecureStore.KeychainAccessibilityConstant
) {
    const enumerable = createKeychainEnumerableStorage(keychainService, keychainAccessible);
    return {
        storage: TreeStorage.root(enumerable),
        enumerable
    };
}

const storagesList = {
    regular: createMMKVTreeStorage('regular'),
    encrypted: createKeychainTreeStorage(
        'safely.encrypted',
        SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    ),
    secureEncrypted: createKeychainTreeStorage(
        'safely.secureEncrypted',
        SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    ),
    mobileLayerSynchronousLocale: createMMKVSyncSingleStorage('mobile_synchronous_locale'),
    mobileLayerSynchronousGlobal: createMMKVSyncKeyValueStorage('mobile_synchronous_global')
};

export async function CLEAR_ALL_MOBILE_STORAGE_ONLY_APP_LEVEL_USE_DANGER() {
    const storages = Object.values(storagesList);
    for (const storageConfig of storages) {
        await storageConfig.storage.clear();
    }
}

export const REGULAR_MOBILE_STORAGE_ONLY_APP_LEVEL_USE = storagesList.regular;
export const ENCRYPTED_MOBILE_STORAGE_ONLY_APP_LEVEL_USE = storagesList.encrypted;
export const SECURE_ENCRYPTED_MOBILE_STORAGE_ONLY_APP_LEVEL_USE = storagesList.secureEncrypted;

export const mobileLayerSynchronousLocale = storagesList.mobileLayerSynchronousLocale;
export const mobileLayerSynchronousGlobal = storagesList.mobileLayerSynchronousGlobal;
