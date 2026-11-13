import type { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import { screen } from 'electron';
import { z } from 'zod';

import type { Logger } from '@safely/sync';

import type { Store } from './store';

const KEY = 'main..windowState';

const SAVE_DELAY_MS = 500;

const MIN_VISIBLE_PX = 100;

const sWindowBounds = z.object({
    x: z.number().int(),
    y: z.number().int(),
    width: z.number().int().positive(),
    height: z.number().int().positive()
});

const sWindowState = sWindowBounds.extend({ isFullScreen: z.boolean() });

type WindowBounds = z.infer<typeof sWindowBounds>;

export type WindowOptions = Pick<BrowserWindowConstructorOptions, 'x' | 'y' | 'width' | 'height'>;

export type RestoredWindowState = { options: WindowOptions; isFullScreen: boolean };

const DEFAULT_STATE: RestoredWindowState = { options: {}, isFullScreen: false };

export class WindowStateStore {
    private timer: NodeJS.Timeout | null = null;

    constructor(
        private readonly store: Store,
        private readonly logger: Logger
    ) {}

    public async read(): Promise<RestoredWindowState> {
        const raw = await this.store.get(KEY);

        if (raw === null) {
            return DEFAULT_STATE;
        }

        const parsed = sWindowState.safeParse(parseJson(raw));

        if (!parsed.success) {
            this.logger.warn('window state ignored', parsed.error.message);
            return DEFAULT_STATE;
        }

        const { x, y, width, height, isFullScreen } = parsed.data;
        const options = isVisibleOnSomeDisplay(parsed.data)
            ? { x, y, width, height }
            : { width, height };

        return { options, isFullScreen };
    }

    public track(window: BrowserWindow): void {
        const save = (): void => {
            this.timer = null;
            void this.write(window);
        };
        const schedule = (): void => {
            if (this.timer !== null) {
                clearTimeout(this.timer);
            }

            this.timer = setTimeout(save, SAVE_DELAY_MS);
        };

        window.on('resize', schedule);
        window.on('move', schedule);
        window.on('enter-full-screen', schedule);
        window.on('leave-full-screen', schedule);
        window.on('close', () => {
            if (this.timer !== null) {
                clearTimeout(this.timer);
                save();
            }
        });
    }

    private async write(window: BrowserWindow): Promise<void> {
        if (window.isDestroyed()) {
            return;
        }

        const state = { ...window.getNormalBounds(), isFullScreen: window.isFullScreen() };

        try {
            await this.store.set(KEY, JSON.stringify(state));
        } catch (error) {
            this.logger.warn('window state not saved', error);
        }
    }
}

function parseJson(raw: string): unknown {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function isVisibleOnSomeDisplay(bounds: WindowBounds): boolean {
    return screen.getAllDisplays().some(({ workArea }) => {
        const visibleWidth =
            Math.min(bounds.x + bounds.width, workArea.x + workArea.width) -
            Math.max(bounds.x, workArea.x);
        const visibleHeight =
            Math.min(bounds.y + bounds.height, workArea.y + workArea.height) -
            Math.max(bounds.y, workArea.y);

        return visibleWidth >= MIN_VISIBLE_PX && visibleHeight >= MIN_VISIBLE_PX;
    });
}
