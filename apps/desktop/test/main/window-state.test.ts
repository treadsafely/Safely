import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from '@safely/sync';

import type { Store } from '../../src/main/store/types';
import { WindowStateStore } from '../../src/main/window-state';

vi.mock('electron', () => ({
    screen: {
        getAllDisplays: () => [{ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }]
    }
}));

const warn = vi.fn();
const logger = { warn } as unknown as Logger;

function storeReturning(get: Store['get']): Store {
    return { get } as unknown as Store;
}

describe('WindowStateStore.read', () => {
    beforeEach(() => {
        warn.mockClear();
    });

    it('falls back to the defaults when the store cannot be read', async () => {
        const store = storeReturning(() =>
            Promise.reject(new SyntaxError('Unexpected end of JSON'))
        );

        await expect(new WindowStateStore(store, logger).read()).resolves.toEqual({
            options: {},
            isFullScreen: false
        });
        expect(warn).toHaveBeenCalledWith('window state store unreadable', expect.any(SyntaxError));
    });

    it('restores a saved state that is visible on a display', async () => {
        const saved = { x: 10, y: 20, width: 800, height: 600, isFullScreen: true };
        const store = storeReturning(() => Promise.resolve(JSON.stringify(saved)));

        await expect(new WindowStateStore(store, logger).read()).resolves.toEqual({
            options: { x: 10, y: 20, width: 800, height: 600 },
            isFullScreen: true
        });
        expect(warn).not.toHaveBeenCalled();
    });
});
