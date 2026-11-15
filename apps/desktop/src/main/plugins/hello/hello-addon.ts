import { createRequire } from 'node:module';
import path from 'node:path';

import type { WindowsHello } from './types';
import { mainLogger } from '../../logger';

export function loadHello(): WindowsHello {
    let addon: WindowsHello | null = null;

    try {
        addon = createRequire(__filename)(
            path.join(process.resourcesPath, 'hello.node')
        ) as WindowsHello;
    } catch {
        addon = null;
    }

    if (!addon) {
        mainLogger.error('The Windows Hello addon is unavailable — this build stores no secrets');
        process.exit(1);
    }

    return addon;
}
