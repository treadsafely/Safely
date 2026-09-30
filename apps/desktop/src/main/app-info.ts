import { app } from 'electron';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

import type { AppInfo } from '../shared/app-info';

/* the hostname is the network name (`MacBook-Pro.local`), not the name the user set */
function readHostname(): string {
    return os.hostname().replace(/\.local$/, '');
}

function readMacComputerName(): string {
    try {
        const name = execFileSync('/usr/sbin/scutil', ['--get', 'ComputerName'], {
            encoding: 'utf8',
            timeout: 2000
        }).trim();

        if (name.length > 0) {
            return name;
        }
    } catch {
        // nothing to do here
    }

    return readHostname();
}

function readDeviceName(): string {
    switch (process.platform) {
        case 'darwin':
            return readMacComputerName();
        case 'win32':
            return process.env.COMPUTERNAME ?? readHostname();
        default:
            return readHostname();
    }
}

export function readAppInfo(): AppInfo {
    return {
        version: app.getVersion(),
        environment: app.isPackaged ? 'production' : 'development',
        deviceName: readDeviceName(),
        osVersion: os.release(),
        locale: app.getLocale(),
        deviceCountryCode: app.getLocaleCountryCode() || null
    };
}
