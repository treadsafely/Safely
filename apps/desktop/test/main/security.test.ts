import { beforeEach, describe, expect, it, vi } from 'vitest';

type RequestDetails = {
    isMainFrame: boolean;
    requestingUrl: string;
    mediaTypes?: Array<'video' | 'audio'>;
};

type RequestHandler = (
    contents: null,
    permission: string,
    callback: (isGranted: boolean) => void,
    details: RequestDetails
) => void;

type CheckHandler = (
    contents: null,
    permission: string,
    origin: string,
    details: { isMainFrame: boolean; mediaType?: 'video' | 'audio' | 'unknown' }
) => boolean;

const onHeadersReceived = vi.fn();
const setPermissionRequestHandler = vi.fn<(handler: RequestHandler) => void>();
const setPermissionCheckHandler = vi.fn<(handler: CheckHandler) => void>();

vi.mock('electron', () => ({
    session: {
        defaultSession: {
            webRequest: {
                get onHeadersReceived() {
                    return onHeadersReceived;
                }
            },
            get setPermissionRequestHandler() {
                return setPermissionRequestHandler;
            },
            get setPermissionCheckHandler() {
                return setPermissionCheckHandler;
            }
        }
    }
}));

const requestVideo = (overrides: Partial<RequestDetails> = {}): boolean => {
    const handler = setPermissionRequestHandler.mock.calls[0]?.[0];
    let granted: boolean | null = null;

    handler?.(
        null,
        'media',
        value => {
            granted = value;
        },
        { isMainFrame: true, requestingUrl: 'safely://app/', mediaTypes: ['video'], ...overrides }
    );

    return granted === true;
};

const check = (permission: string, mediaType?: 'video' | 'audio' | 'unknown'): boolean => {
    const handler = setPermissionCheckHandler.mock.calls[0]?.[0];

    return handler?.(null, permission, 'safely://app', { isMainFrame: true, mediaType }) === true;
};

describe('session permissions', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();

        const { hardenSession } = await import('../../src/main/security');

        hardenSession(undefined);
    });

    it('grants the camera to the top frame', () => {
        expect(requestVideo()).toBe(true);
    });

    it('refuses the microphone, alone or alongside the camera', () => {
        expect(requestVideo({ mediaTypes: ['audio'] })).toBe(false);
        expect(requestVideo({ mediaTypes: ['video', 'audio'] })).toBe(false);
    });

    it('refuses a request that names no media type', () => {
        expect(requestVideo({ mediaTypes: undefined })).toBe(false);
        expect(requestVideo({ mediaTypes: [] })).toBe(false);
    });

    it('refuses a subframe', () => {
        expect(requestVideo({ isMainFrame: false })).toBe(false);
    });

    it('refuses every other permission', () => {
        const handler = setPermissionRequestHandler.mock.calls[0]?.[0];
        let granted: boolean | null = null;

        handler?.(
            null,
            'geolocation',
            value => {
                granted = value;
            },
            { isMainFrame: true, requestingUrl: 'safely://app/' }
        );

        expect(granted).toBe(false);
    });

    /* the typeless check is the one Chromium runs before it exposes device labels */
    it('answers the media check for video and for no type at all', () => {
        expect(check('media', 'video')).toBe(true);
        expect(check('media')).toBe(true);
    });

    it('answers no to the audio and unknown media checks, and to other permissions', () => {
        expect(check('media', 'audio')).toBe(false);
        expect(check('media', 'unknown')).toBe(false);
        expect(check('geolocation')).toBe(false);
        expect(check('hid')).toBe(false);
    });
});
