import type { DesktopOs } from '../../platform';
import { platform } from '../../platform';

const BIOMETRY_COPY = {
    darwin: {
        title: 'biometry.fingerprint.ios.title',
        description: 'biometry.fingerprint.ios.description',
        reason: 'biometry.reason'
    },
    win32: {
        title: 'biometry.hello.title',
        description: 'biometry.hello.description',
        reason: 'biometry.presence'
    },
    other: {
        title: 'biometry.fingerprint.other.title',
        description: 'biometry.fingerprint.other.description',
        reason: 'biometry.reason'
    }
} as const satisfies Record<DesktopOs, { title: string; description: string; reason: string }>;

export const biometryCopy = BIOMETRY_COPY[platform.os];
