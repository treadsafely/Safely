import { useEffect, useRef } from 'react';

import { createQrDetector } from './barcode-detector';

/* a 1080p frame costs ~15 ms to detect and a 960-wide copy of it ~9 ms, measured on Chromium 150 */
const DECODE_WIDTH = 960;
const DECODE_INTERVAL_MS = 100;

export type UseQrDetectionOptions = {
    video: HTMLVideoElement | null;
    isEnabled: boolean;
    onDetected: (value: string) => void;
    onUnsupported?: () => void;
};

export function useQrDetection(options: UseQrDetectionOptions): void {
    const { video, isEnabled, onDetected, onUnsupported } = options;

    /* the callbacks close over the caller's render, and re-running the effect would rebuild the
       detector and pay its cold start again */
    const callbacks = useRef({ onDetected, onUnsupported });

    useEffect(() => {
        callbacks.current = { onDetected, onUnsupported };
    });

    useEffect(() => {
        if (video === null || !isEnabled) {
            return;
        }

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        let isCancelled = false;
        let isDecoding = false;
        let lastDecodedAt = 0;
        let frameHandle: number | null = null;

        const run = async () => {
            const detector = await createQrDetector();

            if (isCancelled) {
                return;
            }

            if (detector === null) {
                callbacks.current.onUnsupported?.();
                return;
            }

            const decode = async () => {
                if (context === null || video.videoWidth === 0 || video.videoHeight === 0) {
                    return;
                }

                const scale = Math.min(1, DECODE_WIDTH / video.videoWidth);

                canvas.width = Math.round(video.videoWidth * scale);
                canvas.height = Math.round(video.videoHeight * scale);
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                /* a frame the detector cannot read is the normal case, not an error to report */
                const codes = await detector.detect(canvas).catch(() => []);
                const value = codes[0]?.rawValue;

                if (value !== undefined && value !== '' && !isCancelled) {
                    isCancelled = true;
                    callbacks.current.onDetected(value);
                }
            };

            const tick = (timestamp: number) => {
                if (isCancelled) {
                    return;
                }

                frameHandle = requestAnimationFrame(tick);

                if (isDecoding || timestamp - lastDecodedAt < DECODE_INTERVAL_MS) {
                    return;
                }

                lastDecodedAt = timestamp;
                isDecoding = true;
                void decode().finally(() => {
                    isDecoding = false;
                });
            };

            frameHandle = requestAnimationFrame(tick);
        };

        void run();

        return () => {
            isCancelled = true;

            if (frameHandle !== null) {
                cancelAnimationFrame(frameHandle);
            }
        };
    }, [video, isEnabled]);
}
