import { useCallback, useState } from 'react';
import z from 'zod';

import { platform } from '../../../platform';

const desktopLayerSynchronousGlobalStructure = {
    devToken: z.string().nullable(),
    devIsTestnetAllowed: z.boolean().nullable()
};

type DesktopLayerSynchronousGlobalStructure = typeof desktopLayerSynchronousGlobalStructure;
type StorageKey = keyof DesktopLayerSynchronousGlobalStructure;

const storage = platform.storage.synchronous;

function parseRaw(raw: string): unknown {
    try {
        return JSON.parse(raw);
    } catch {
        return raw;
    }
}

function get<K extends StorageKey>(key: K): z.output<DesktopLayerSynchronousGlobalStructure[K]> {
    const raw = storage.get(key);

    const parsed = desktopLayerSynchronousGlobalStructure[key].safeParse(
        raw === null ? null : parseRaw(raw)
    );

    return (parsed.success ? parsed.data : null) as z.output<
        DesktopLayerSynchronousGlobalStructure[K]
    >;
}

function set<K extends StorageKey>(
    key: K,
    value: z.input<DesktopLayerSynchronousGlobalStructure[K]>
): void {
    desktopLayerSynchronousGlobalStructure[key].parse(value);
    storage.set(key, JSON.stringify(value));
}

function remove(key: StorageKey): void {
    storage.remove(key);
}

export const desktopLayerSynchronousGlobalStorage = { get, set, remove };

export function useDesktopLayerSynchronousGlobalStorage<K extends StorageKey>(key: K) {
    const [value, setValue] = useState<z.output<DesktopLayerSynchronousGlobalStructure[K]>>(() =>
        get(key)
    );

    const setStored = useCallback(
        (next: z.input<DesktopLayerSynchronousGlobalStructure[K]>) => {
            set(key, next);
            setValue(get(key));
        },
        [key]
    );

    const removeStored = useCallback(() => {
        remove(key);
        setValue(get(key));
    }, [key]);

    return { value, set: setStored, remove: removeStored };
}
