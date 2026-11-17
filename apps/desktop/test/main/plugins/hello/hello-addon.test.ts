import { afterEach, describe, expect, it, vi } from 'vitest';

const error = vi.fn();

vi.mock('../../../../src/main/logger', () => ({ mainLogger: { error } }));

describe('Windows Hello addon', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        error.mockClear();
    });

    /* the same contract as the keychain loader: no addon means no store, and the process ends */
    it('logs and exits when the addon cannot be loaded', async () => {
        const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        const { loadHello } = await import('../../../../src/main/plugins/hello/hello-addon');

        loadHello();

        expect(exit).toHaveBeenCalledWith(1);
        expect(error).toHaveBeenCalledOnce();
    });
});
