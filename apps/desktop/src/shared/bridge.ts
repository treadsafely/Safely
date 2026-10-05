import type { AppInfo } from './app-info';
import type { AppState, CameraAccessStatus } from './ipc';

/**
 * The only path from the web UI to Electron, and the only module both processes may import.
 * Every member is a concrete capability, never a generic "invoke this channel" escape hatch —
 * this is the surface a compromised renderer inherits.
 */
export const BRIDGE_KEY = 'safelyDesktop';

/** One handle per backing store; which store it is comes from the channels it was built with. */
export interface DesktopStoreBridge {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(prefix: string): Promise<string[]>;
    removeWithPrefix(prefix: string): Promise<void>;
}

export interface DesktopBiometryBridge {
    isAvailable(): Promise<boolean>;
    authenticate(reason: string): Promise<boolean>;
}

export interface DesktopCameraBridge {
    getAccessStatus(): Promise<CameraAccessStatus>;
    /* resolves to `false` for a refusal and for an answer macOS already remembers */
    requestAccess(): Promise<boolean>;
    openPrivacySettings(): Promise<void>;
}

export interface DesktopLogsBridge {
    append(lines: string[]): void;
    read(): Promise<string[]>;
    erase(): Promise<void>;
    share(): Promise<void>;
}

export interface DesktopBridge {
    platform: string;

    versions: {
        electron: string;
        chrome: string;
    };

    readonly appInfo: AppInfo;

    relaunch(): void;

    clearAllData(): Promise<void>;

    onAppStateChange(callback: (state: AppState) => void): () => void;

    isFullScreen(): Promise<boolean>;

    onFullScreenChange(callback: (isFullScreen: boolean) => void): () => void;

    setContentProtection(isEnabled: boolean): Promise<void>;

    openExternalUrl(url: string): Promise<void>;

    biometry: DesktopBiometryBridge;

    camera: DesktopCameraBridge;

    logs: DesktopLogsBridge;

    store: DesktopStoreBridge;

    encryptedStore: DesktopStoreBridge;

    secureEncryptedStore: DesktopStoreBridge;
}

declare global {
    interface Window {
        /** Injected by the preload script; absent when the UI runs outside Electron. */
        safelyDesktop?: DesktopBridge;
    }
}
