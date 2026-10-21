import { afterEach, describe, expect, it, vi } from 'vitest';

const error = vi.fn();

/* The addon module logs through main's logger, which reaches for `electron` at import. */
vi.mock('../../../../src/main/logger', () => ({ mainLogger: { error } }));

describe('keychain addon', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        error.mockClear();
    });

    /* Nothing here can load a real addon, which is exactly the case being pinned: the store has no
       fallback, so the process must end rather than serve IPC without a keychain. It must not throw
       — that reaches Electron's own handler, which raises a modal dialog and waits. */
    it('logs and exits when the keychain cannot be reached', async () => {
        const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

        vi.resetModules();
        await import('../../../../src/main/plugins/keychain/keychain-addon');

        expect(exit).toHaveBeenCalledWith(1);
        expect(error).toHaveBeenCalledOnce();
    });
});
