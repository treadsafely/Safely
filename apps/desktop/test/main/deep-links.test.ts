import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from '@safely/sync';

import { DeepLinkReceiver, findDeepLinkArgument } from '../../src/main/deep-links';
import { DEEP_LINK_MAX_LENGTH, IPC_CHANNEL } from '../../src/shared/ipc';

type AppListener = (event: { preventDefault: () => void }, ...args: unknown[]) => void;

const listeners = new Map<string, AppListener>();

vi.mock('electron', () => ({
    app: {
        on: (name: string, listener: AppListener) => {
            listeners.set(name, listener);
        }
    }
}));

const warn = vi.fn();
const send = vi.fn();
const reveal = vi.fn();

const logger = { warn } as unknown as Logger;
const window = { webContents: { send } };

function emit(name: string, ...args: unknown[]): boolean {
    let isPrevented = false;

    listeners.get(name)?.({ preventDefault: () => (isPrevented = true) }, ...args);

    return isPrevented;
}

const browsingWeb = (webpageURL?: string): unknown[] => [
    'NSUserActivityTypeBrowsingWeb',
    {},
    webpageURL === undefined ? {} : { webpageURL }
];

describe('DeepLinkReceiver', () => {
    beforeEach(() => {
        listeners.clear();
        vi.clearAllMocks();
    });

    it('holds a URL that arrives before the window exists and hands it out once', () => {
        const receiver = new DeepLinkReceiver(logger, () => null, reveal);

        receiver.listen();

        expect(emit('open-url', 'safely:///tab')).toBe(true);
        expect(send).not.toHaveBeenCalled();
        expect(reveal).not.toHaveBeenCalled();
        expect(receiver.take()).toBe('safely:///tab');
        expect(receiver.take()).toBeNull();
    });

    it('notifies and reveals the window when one exists', () => {
        const receiver = new DeepLinkReceiver(logger, () => window as never, reveal);

        receiver.listen();
        emit('open-url', 'safely:///tab/updates');

        expect(send).toHaveBeenCalledWith(IPC_CHANNEL.deepLink.received);
        expect(reveal).toHaveBeenCalledOnce();
        expect(receiver.take()).toBe('safely:///tab/updates');
    });

    it('keeps the last URL when two arrive before one is taken', () => {
        const receiver = new DeepLinkReceiver(logger, () => null, reveal);

        receiver.listen();
        emit('open-url', 'safely:///tab');
        emit('open-url', 'safely:///tab/updates');

        expect(receiver.take()).toBe('safely:///tab/updates');
    });

    it('takes a universal link from the browsing activity and nothing else', () => {
        const receiver = new DeepLinkReceiver(logger, () => null, reveal);

        receiver.listen();

        expect(emit('continue-activity', 'com.example.handoff', {}, {})).toBe(false);
        expect(emit('continue-activity', ...browsingWeb())).toBe(false);
        expect(receiver.take()).toBeNull();

        expect(emit('continue-activity', ...browsingWeb('https://link.safely.app/tab'))).toBe(true);
        expect(receiver.take()).toBe('https://link.safely.app/tab');
    });

    it('takes a link from the arguments of a second instance', () => {
        const receiver = new DeepLinkReceiver(logger, () => window as never, reveal);

        receiver.listen();
        receiver.receiveArguments(['Safely.exe', 'safely:///tab/updates']);

        expect(send).toHaveBeenCalledWith(IPC_CHANNEL.deepLink.received);
        expect(receiver.take()).toBe('safely:///tab/updates');
    });

    it('drops a URL over the limit without logging it', () => {
        const receiver = new DeepLinkReceiver(logger, () => null, reveal);
        const url = `safely:///${'a'.repeat(DEEP_LINK_MAX_LENGTH)}`;

        receiver.listen();
        emit('open-url', url);

        expect(receiver.take()).toBeNull();
        expect(warn).toHaveBeenCalledOnce();
        expect(JSON.stringify(warn.mock.calls)).not.toContain('aaaa');
    });
});

describe('findDeepLinkArgument', () => {
    it('finds the one argument that is a link of our scheme', () => {
        expect(findDeepLinkArgument(['Safely.exe', '--allow-file-access', 'safely:///tab'])).toBe(
            'safely:///tab'
        );
    });

    it('ignores the executable, switches and foreign schemes', () => {
        expect(findDeepLinkArgument(['safely:///tab'])).toBeNull();
        expect(findDeepLinkArgument(['Safely.exe', '--inspect=9229'])).toBeNull();
        expect(findDeepLinkArgument(['Safely.exe', 'https://link.safely.app/tab'])).toBeNull();
        expect(findDeepLinkArgument(['Safely.exe'])).toBeNull();
    });

    /* a link is data, never a command line: a switch smuggled in after it stays inside the string */
    it('never lets a switch travel inside a link', () => {
        const smuggled = 'safely:///tab" --gpu-launcher=calc';

        expect(findDeepLinkArgument(['Safely.exe', smuggled])).toBe(smuggled);
        expect(findDeepLinkArgument(['Safely.exe', '--gpu-launcher=calc', 'safely:///tab'])).toBe(
            'safely:///tab'
        );
    });
});
