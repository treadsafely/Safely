import type { Build, IEnumerableStorage, ISyncKeyValueStorage } from '@safely/core';
import type { ILogFileStore } from '@safely/sync';
import type { AppStateStatus, LedgerTransport } from '@safely/ux';

import type { AppInfo } from '../../shared/app-info';
import type { DesktopBiometryBridge, DesktopCameraBridge } from '../../shared/bridge';

/**
 * What the renderer supplies to the shared UI — the app's own contract, not one `@safely/web-ui`
 * dictates: an extension differs in storage, in user presence and in how it opens links, and would
 * describe itself with its own shape.
 */
export interface DesktopPlatformStorage {
    REGULAR_DESKTOP_STORAGE_ONLY_APP_LEVEL_USE: IEnumerableStorage;

    ENCRYPTED_DESKTOP_STORAGE_ONLY_APP_LEVEL_USE: IEnumerableStorage;

    SECURE_ENCRYPTED_DESKTOP_STORAGE_ONLY_APP_LEVEL_USE: IEnumerableStorage;

    synchronous: ISyncKeyValueStorage;
}

export interface DesktopPlatform {
    readonly appInfo: AppInfo & { build: Build };

    readonly storage: DesktopPlatformStorage;

    readonly biometry: DesktopBiometryBridge;

    readonly camera: DesktopCameraBridge;

    readonly logs: ILogFileStore;

    openExternalUrl(url: string): Promise<void>;

    protectScreen(this: void, isProtected: boolean): void;

    reloadApp(): void;

    clearAllData(): Promise<void>;

    subscribeAppStateChange(callback: (status: AppStateStatus) => void): () => void;

    subscribeFullScreen(this: void, onChange: () => void): () => void;

    getIsFullScreen(this: void): boolean;

    /** Absent until a Ledger transport lands (WebHID). */
    readonly ledgerTransport?: LedgerTransport;
}
