import { contextBridge, ipcRenderer } from 'electron';

import { parseAppInfoArgument } from '../shared/app-info';
import type { DesktopBridge, DesktopStoreBridge } from '../shared/bridge';
import { BRIDGE_KEY } from '../shared/bridge';
import type { AppState, StoreChannels } from '../shared/ipc';
import {
    IPC_CHANNEL,
    sAppState,
    sBiometryResult,
    sCameraAccessGranted,
    sCameraAccessStatus,
    sIsFullScreen,
    sLogLines
} from '../shared/ipc';

function createStoreBridge(channels: StoreChannels): DesktopStoreBridge {
    return {
        async get(key: string): Promise<string | null> {
            const value: unknown = await ipcRenderer.invoke(channels.get, { key });

            return typeof value === 'string' ? value : null;
        },
        async set(key: string, value: string): Promise<void> {
            await ipcRenderer.invoke(channels.set, { key, value });
        },
        async remove(key: string): Promise<void> {
            await ipcRenderer.invoke(channels.remove, { key });
        },
        async clear(): Promise<void> {
            await ipcRenderer.invoke(channels.clear);
        },
        async keys(prefix: string): Promise<string[]> {
            const keys: unknown = await ipcRenderer.invoke(channels.keys, { prefix });

            return Array.isArray(keys) ? keys.filter(key => typeof key === 'string') : [];
        },
        async removeWithPrefix(prefix: string): Promise<void> {
            await ipcRenderer.invoke(channels.removePrefix, { prefix });
        }
    };
}

/**
 * Transport only. Requests are validated in main; responses are parsed here so a malformed
 * reply cannot slip into the UI as a typed value.
 */
const bridge: DesktopBridge = {
    platform: process.platform,
    versions: {
        electron: process.versions.electron,
        chrome: process.versions.chrome
    },

    appInfo: parseAppInfoArgument(process.argv),

    relaunch(): void {
        void ipcRenderer.invoke(IPC_CHANNEL.appRelaunch);
    },

    async clearAllData(): Promise<void> {
        await ipcRenderer.invoke(IPC_CHANNEL.appClearData);
    },

    onAppStateChange(callback: (state: AppState) => void): () => void {
        const listener = (_event: unknown, raw: unknown) => callback(sAppState.parse(raw));

        ipcRenderer.on(IPC_CHANNEL.appState, listener);

        return () => {
            ipcRenderer.removeListener(IPC_CHANNEL.appState, listener);
        };
    },

    async isFullScreen(): Promise<boolean> {
        return sIsFullScreen.parse(await ipcRenderer.invoke(IPC_CHANNEL.windowFullScreen));
    },

    onFullScreenChange(callback: (isFullScreen: boolean) => void): () => void {
        const listener = (_event: unknown, raw: unknown) => callback(sIsFullScreen.parse(raw));

        ipcRenderer.on(IPC_CHANNEL.windowFullScreen, listener);

        return () => {
            ipcRenderer.removeListener(IPC_CHANNEL.windowFullScreen, listener);
        };
    },

    async setContentProtection(isEnabled: boolean): Promise<void> {
        await ipcRenderer.invoke(IPC_CHANNEL.windowContentProtection, { isEnabled });
    },

    async openExternalUrl(url: string): Promise<void> {
        await ipcRenderer.invoke(IPC_CHANNEL.openExternal, { url });
    },

    biometry: {
        async isAvailable(): Promise<boolean> {
            return sBiometryResult.parse(
                await ipcRenderer.invoke(IPC_CHANNEL.biometry.availability)
            );
        },
        async authenticate(reason: string): Promise<boolean> {
            return sBiometryResult.parse(
                await ipcRenderer.invoke(IPC_CHANNEL.biometry.authenticate, { reason })
            );
        }
    },

    camera: {
        async getAccessStatus() {
            return sCameraAccessStatus.parse(
                await ipcRenderer.invoke(IPC_CHANNEL.camera.accessStatus)
            );
        },
        async requestAccess() {
            return sCameraAccessGranted.parse(
                await ipcRenderer.invoke(IPC_CHANNEL.camera.requestAccess)
            );
        },
        async openPrivacySettings(): Promise<void> {
            await ipcRenderer.invoke(IPC_CHANNEL.camera.openPrivacySettings);
        }
    },

    logs: {
        append(lines: string[]): void {
            ipcRenderer.send(IPC_CHANNEL.logs.append, { lines });
        },
        async read(): Promise<string[]> {
            return sLogLines.parse(await ipcRenderer.invoke(IPC_CHANNEL.logs.read));
        },
        async erase(): Promise<void> {
            await ipcRenderer.invoke(IPC_CHANNEL.logs.erase);
        },
        async share(): Promise<void> {
            await ipcRenderer.invoke(IPC_CHANNEL.logs.share);
        }
    },

    store: createStoreBridge(IPC_CHANNEL.store),

    encryptedStore: createStoreBridge(IPC_CHANNEL.encryptedStore),

    secureEncryptedStore: createStoreBridge(IPC_CHANNEL.secureEncryptedStore)
};

contextBridge.exposeInMainWorld(BRIDGE_KEY, bridge);
