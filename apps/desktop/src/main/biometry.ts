import { systemPreferences } from 'electron';

import { mainLogger } from './logger';

export function isBiometryAvailable(): boolean {
    return process.platform === 'darwin' && systemPreferences.canPromptTouchID();
}

export async function promptBiometry(reason: string): Promise<boolean> {
    if (!isBiometryAvailable()) {
        return false;
    }

    try {
        await systemPreferences.promptTouchID(reason);

        return true;
    } catch (error) {
        mainLogger.info('Touch ID was not satisfied', error);

        return false;
    }
}
