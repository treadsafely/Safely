import type { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { ipcMain, shell } from 'electron';
import type { ZodType } from 'zod';

import { isBiometryAvailable, promptBiometry } from './biometry';
import { getCameraAccessStatus, openCameraPrivacySettings, requestCameraAccess } from './camera';
import { fileTransport, logStore, mainLogger } from './logger';
import type { StoreScope } from './store';
import { clearStores, getStore } from './store';
import type { CameraAccessStatus, StoreChannels } from '../shared/ipc';
import {
    IPC_CHANNEL,
    sBiometryAuthenticateRequest,
    sContentProtectionRequest,
    sLogAppendRequest,
    sOpenExternalRequest,
    sStoreKeyRequest,
    sStorePrefixRequest,
    sStoreSetRequest
} from '../shared/ipc';

/** Protocols main is willing to hand to the OS, regardless of what the renderer claims. */
const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:', 'mailto:', 'tg:']);

/**
 * Validated here rather than in the sandboxed preload: main is the authoritative side, and the
 * renderer is not a trusted caller even though it is our own code.
 */
function handle<T>(
    channel: string,
    schema: ZodType<T>,
    handler: (payload: T, event: IpcMainInvokeEvent) => unknown
): void {
    ipcMain.handle(channel, async (event, rawPayload) => {
        assertTrustedSender(event);

        return handler(schema.parse(rawPayload), event);
    });
}

function assertTrustedSender(event: IpcMainInvokeEvent | IpcMainEvent): void {
    if (!isTrustedSender(event)) {
        throw new Error('IPC is only available to the top-level frame');
    }
}

function isTrustedSender(event: IpcMainInvokeEvent | IpcMainEvent): boolean {
    return event.senderFrame !== null && event.senderFrame.parent === null;
}

export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
    ipcMain.handle(IPC_CHANNEL.windowFullScreen, (event): boolean => {
        assertTrustedSender(event);

        return getWindow()?.isFullScreen() ?? false;
    });

    ipcMain.handle(IPC_CHANNEL.appRelaunch, event => {
        assertTrustedSender(event);
        getWindow()?.reload();
    });

    ipcMain.handle(IPC_CHANNEL.appClearData, async event => {
        assertTrustedSender(event);
        await clearStores();
        await logStore.erase();
        fileTransport.reset();
    });

    ipcMain.on(IPC_CHANNEL.logs.append, (event, rawPayload) => {
        if (!isTrustedSender(event)) {
            return;
        }

        const parsed = sLogAppendRequest.safeParse(rawPayload);

        if (!parsed.success) {
            mainLogger.warn(
                'rejected a log batch from the renderer',
                parsed.error.issues[0]?.message
            );
            return;
        }

        logStore.append(parsed.data.lines);
    });

    ipcMain.handle(IPC_CHANNEL.logs.read, event => {
        assertTrustedSender(event);

        return logStore.read();
    });

    ipcMain.handle(IPC_CHANNEL.logs.erase, event => {
        assertTrustedSender(event);

        return logStore.erase();
    });

    ipcMain.handle(IPC_CHANNEL.logs.share, event => {
        assertTrustedSender(event);

        return logStore.share();
    });

    handle(IPC_CHANNEL.windowContentProtection, sContentProtectionRequest, payload => {
        getWindow()?.setContentProtection(payload.isEnabled);
    });

    handle(IPC_CHANNEL.openExternal, sOpenExternalRequest, async payload => {
        const { protocol } = new URL(payload.url);

        if (!ALLOWED_EXTERNAL_PROTOCOLS.has(protocol)) {
            throw new Error(`Refusing to open ${protocol} externally`);
        }

        await shell.openExternal(payload.url);
    });

    ipcMain.handle(IPC_CHANNEL.biometry.availability, (event): boolean => {
        assertTrustedSender(event);

        return isBiometryAvailable();
    });

    handle(IPC_CHANNEL.biometry.authenticate, sBiometryAuthenticateRequest, payload =>
        promptBiometry(payload.reason)
    );

    ipcMain.handle(IPC_CHANNEL.camera.accessStatus, (event): CameraAccessStatus => {
        assertTrustedSender(event);

        return getCameraAccessStatus();
    });

    ipcMain.handle(IPC_CHANNEL.camera.requestAccess, event => {
        assertTrustedSender(event);

        return requestCameraAccess();
    });

    ipcMain.handle(IPC_CHANNEL.camera.openPrivacySettings, event => {
        assertTrustedSender(event);

        return openCameraPrivacySettings();
    });

    registerStoreHandlers(IPC_CHANNEL.store, 'regular');
    registerStoreHandlers(IPC_CHANNEL.encryptedStore, 'encrypted');
    registerStoreHandlers(IPC_CHANNEL.secureEncryptedStore, 'secureEncrypted');
}

/* The stores are resolved per call, not captured: `createStores()` runs after the app is ready. */
function registerStoreHandlers(channels: StoreChannels, scope: StoreScope): void {
    handle(channels.get, sStoreKeyRequest, payload => getStore(scope).get(payload.key));

    handle(channels.set, sStoreSetRequest, payload =>
        getStore(scope).set(payload.key, payload.value)
    );

    handle(channels.remove, sStoreKeyRequest, payload => getStore(scope).remove(payload.key));

    ipcMain.handle(channels.clear, event => {
        assertTrustedSender(event);

        return getStore(scope).clear();
    });

    handle(channels.keys, sStorePrefixRequest, payload => getStore(scope).keys(payload.prefix));

    handle(channels.removePrefix, sStorePrefixRequest, payload =>
        getStore(scope).removeWithPrefix(payload.prefix)
    );
}
