import { app } from 'electron';

/**
 * Without this a dev run would read and write the real wallet's profile. Must run before the
 * app is ready.
 */
export function useSeparateDevUserData(): void {
    if (app.isPackaged) {
        return;
    }

    app.setPath('userData', `${app.getPath('userData')}-dev`);
}
